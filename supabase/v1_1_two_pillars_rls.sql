-- ============================================================================
-- PATCH PRODUCTION 2026-09-28 — v1.1 "TWO PILLARS"
-- Owner = Monitoring & Approval; Manager = Eksekusi & Input Data.
--
-- Perubahan:
--   1) MANAGER jadi inputer keuangan: INSERT financial_transactions,
--      cash_transactions (kas masuk/keluar & pengeluaran). Tanpa UPDATE/
--      DELETE (koreksi data tetap lewat Owner/Developer).
--   2) ACCOUNTANT (Finance) jadi view-only: INSERT/UPDATE/DELETE dihapus
--      dari policy financial_transactions & cash_transactions.
--   3) Guard DB-level: hanya OWNER yang boleh mengubah status approval
--      menjadi persetujuan/realisasi (Disetujui*/Direalisasikan*/Selesai),
--      mengimbangi Manager yang kini punya akses tulis keuangan.
--   4) purchase_requests: Manager boleh membuat permintaan pembelian.
--
-- Idempotent: aman dijalankan berulang.
-- ============================================================================

-- A) financial_transactions: Manager INSERT+SELECT; Finance view-only; Owner INSERT
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
