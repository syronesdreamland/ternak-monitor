-- ============================================================================
-- APPLY 2026-10-02 — FIX SINKRONISASI ANTAR PERANGKAT (RLS PRODUCTION MASIH LAMA)
--
-- Diagnosa terverifikasi (probe REST production, 2026-10-02):
--   Database production BELUM menerapkan 3 patch RLS v1.1 yang sudah di-commit:
--     1) v1_1_two_pillars_rls.sql            (Manager input keuangan + guard status)
--     2) v1_1_manager_op_rls.sql             (Manager edit/hapus data operasional)
--     3) fix_fundreq_requester_edit_rls.sql  (pembuat edit/batalkan pengajuan sendiri)
--   Bukti probe:
--     - Aziz (MANAGER) INSERT financial_transactions -> 403 DITOLAK
--     - Aziz (MANAGER) INSERT cash_transactions      -> 403 DITOLAK
--     - Aziz PATCH/DELETE livestock                  -> 200 tapi 0 row (diblok SENYAP)
--   Dampak nyata: input Manager hanya tersimpan di perangkat penginput,
--   tidak pernah sampai ke database -> tidak muncul di perangkat lain
--   dan hilang setelah refresh.
--
-- CARA APPLY: Supabase Dashboard -> SQL Editor -> paste SELURUH file ini -> Run.
-- Idempotent: aman dijalankan berulang.
-- ============================================================================


-- ========== 1/3: v1.1 TWO PILLARS (Manager input keuangan + guard status) ==========
drop policy if exists "role_read" on public.financial_transactions;
drop policy if exists "role_insert" on public.financial_transactions;
drop policy if exists "role_update" on public.financial_transactions;
drop policy if exists "role_delete" on public.financial_transactions;

create policy "role_read" on public.financial_transactions
  for select to authenticated
  using (public.current_role() = any (array['OWNER','ACCOUNTANT','MANAGER']));

create policy "role_insert" on public.financial_transactions
  for insert to authenticated
  with check (public.current_role() = any (array['OWNER','MANAGER']));

create policy "role_update" on public.financial_transactions
  for update to authenticated
  using (public.current_role() = 'OWNER')
  with check (public.current_role() = 'OWNER');

create policy "role_delete" on public.financial_transactions
  for delete to authenticated
  using (public.current_role() = 'OWNER');

-- B) cash_transactions (Kas Masuk & Keluar): pola sama dengan financial_transactions
drop policy if exists "role_read" on public.cash_transactions;
drop policy if exists "role_insert" on public.cash_transactions;
drop policy if exists "role_update" on public.cash_transactions;
drop policy if exists "role_delete" on public.cash_transactions;

create policy "role_read" on public.cash_transactions
  for select to authenticated
  using (public.current_role() = any (array['OWNER','ACCOUNTANT','MANAGER']));

create policy "role_insert" on public.cash_transactions
  for insert to authenticated
  with check (public.current_role() = any (array['OWNER','MANAGER']));

create policy "role_update" on public.cash_transactions
  for update to authenticated
  using (public.current_role() = 'OWNER')
  with check (public.current_role() = 'OWNER');

create policy "role_delete" on public.cash_transactions
  for delete to authenticated
  using (public.current_role() = 'OWNER');

-- C) purchase_requests: Manager boleh membuat permintaan (eksekusi pembelian)
drop policy if exists "role_insert" on public.purchase_requests;
create policy "role_insert" on public.purchase_requests
  for insert to authenticated
  with check (public.current_role() = any (array['OWNER','MANAGER','ACCOUNTANT']));

-- D) Guard status approval: persetujuan/realisasi hanya via OWNER.
--    Manager/Accountant/Mitra tidak boleh menaikkan status ke level keputusan
--    (Disetujui legacy, Disetujui Owner, Direalisasikan Manager, Selesai)
--    meskipun lewat jalur lain. 'Dicairkan'/'Perlu Revisi'/'Ditolak' tetap
--    boleh untuk Accountant sesuai workflow legacy.
create or replace function public.guard_approval_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
begin
  v_role := public.current_role();
  if v_role is null or v_role = 'OWNER' then
    return coalesce(new, old);
  end if;
  if new.status in ('Disetujui','Disetujui Owner','Direalisasikan Manager','Selesai') then
    raise exception 'Hanya Owner yang dapat mengubah status pengajuan menjadi "%"', new.status
      using errcode = '42501';
  end if;
  return coalesce(new, old);
end;
$$;

drop trigger if exists guard_approval_status on public.approval_requests;
create trigger guard_approval_status
  before update of status on public.approval_requests
  for each row execute function public.guard_approval_status();


-- ========== 2/3: MANAGER UPDATE/DELETE DATA OPERASIONAL ==========
do $$
declare t text;
begin
  foreach t in array array[
    'locations','pens','livestock','weight_records','health_records',
    'breeding_records','birth_records','death_records','transfer_records',
    'feed_inventory','daily_reports','crop_records','crop_activities',
    'garden_documents','ponds','water_quality_records','fish_feed_logs',
    'fish_harvest_records','wildlife_records','wildlife_feed_schedules',
    'stock_mutations','tasks','attendance_records','kpi_scores'
  ]
  loop
    execute format('drop policy if exists "role_update" on public.%I;', t);
    execute format('drop policy if exists "role_delete" on public.%I;', t);
    execute format($p$
      create policy "role_update" on public.%I
      for update to authenticated
      using (public.current_role() = any (array['OWNER','MANAGER']))
      with check (public.current_role() = any (array['OWNER','MANAGER']));
    $p$, t);
    execute format($p$
      create policy "role_delete" on public.%I
      for delete to authenticated
      using (public.current_role() = any (array['OWNER','MANAGER']));
    $p$, t);
  end loop;
end $$;

-- Verifikasi cepat (jalankan terpisah bila perlu):
--   select tablename, policyname, cmd, roles, qual
--   from pg_policies
--   where schemaname = 'public' and tablename = 'livestock'
--   order by policyname;
-- Harap menunjukkan role_update & role_delete livestock berisi OWNER, MANAGER.


-- ========== 3/3: PENGAJUAN DANA - EDIT/BATALKAN OLEH PEMBUAT ==========
drop policy if exists "requester_update_own_pending" on public.approval_requests;

create policy "requester_update_own_pending" on public.approval_requests
  for update to authenticated
  using (
    payload is not null
    and payload->>'requesterId' = auth.uid()::text
    and payload->>'status' = 'Diajukan'
  )
  with check (
    payload is not null
    and payload->>'requesterId' = auth.uid()::text
    and payload->>'status' in ('Diajukan', 'Dibatalkan')
  );

-- Verifikasi
select policyname, cmd, roles
from pg_policies
where schemaname = 'public' and tablename = 'approval_requests'
order by policyname;


-- ============================================================================
-- VERIFIKASI SETELAH RUN (harus menunjukkan policy baru):
-- ============================================================================
select tablename, policyname, cmd
from pg_policies
where schemaname = 'public'
  and tablename in ('financial_transactions','cash_transactions','livestock','approval_requests')
order by tablename, policyname;
