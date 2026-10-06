-- ============================================================================
-- APPLY 2026-10-06 — PENUTUP SISA CELAH RLS (C2 + REALISASI MANAGER + BUKTI BAYAR)
--
-- Latar belakang (audit 2026-10-06, matrix permissions.ts v1.1 vs policy DB):
--   Setelah File A/B/C ter-apply, tersisa 3 celah yang semua polanya sama:
--   "UI mengizinkan, DB menolak senyap" (input hilang setelah refresh):
--
--   1) C2 (sisa 2026-10-04): role_read lpj_reports cuma OWNER/ACCOUNTANT.
--      Manager bisa INSERT LPJ tapi list-nya selalu kosong.
--
--   2) REALISASI PENGAJUAN DANA oleh Manager (alur v1.1:
--      Disetujui Owner -> Direalisasikan Manager -> Selesai):
--      - approval_requests TIDAK punya policy UPDATE utk Manager, dan
--      - trigger guard_approval_status memblok status 'Direalisasikan
--        Manager'/'Selesai' utk non-Owner — kontradiksi dgn desain v1.1
--        (Manager = eksekutor pengeluaran).
--      Akibat: tombol "Realisasi"/"Tandai Selesai" di HP Manager gagal senyap.
--
--   3) BUKTI PEMBAYARAN INVOICE oleh Manager: tombol "Bayar" terbuka utk
--      semua role dan store mengizinkan tanpa cek role, tapi RLS invoices
--      UPDATE cuma OWNER/ACCOUNTANT -> bukti bayar tak pernah sampai DB.
--
-- Juga ditambahkan (jaga-jaga, kebalikan arah):
--   - guard_invoice_cancel: hanya OWNER boleh membawa status invoice ke
--     'Dibatalkan' (tombol Batalkan memang Owner-only di UI). Tanpa ini,
--     peluasan UPDATE invoices ke Manager membuka celah batal-invoice via API.
--
-- TETAP DILARANG (negative test — harus tetap GAGAL untuk Manager):
--   - UPDATE approval_requests ke 'Disetujui'/'Disetujui Owner'  (guard trigger)
--   - UPDATE approval_requests dokumen milik user lain           (policy update)
--   - UPDATE invoices ke status 'Dibatalkan'                     (guard trigger)
--
-- CARA RUN: Supabase Dashboard -> SQL Editor -> New query ->
--           upload/paste SELURUH isi file ini (dari FILE, bukan dari chat) ->
--           Run. Idempotent, aman diulang.
-- ============================================================================

-- 1) C2: Manager boleh MELIHAT LPJ (list tidak lagi kosong)
drop policy if exists "role_read" on public.lpj_reports;
create policy "role_read" on public.lpj_reports
  for select to authenticated
  using (public.current_role() = any (array['OWNER','ACCOUNTANT','MANAGER']));

-- 2a) Realisasi: Manager boleh update dokumen pengajuan dana MILIKNYA sendiri
--     (requesterId di payload = uid). Owner/Accountant tetap penuh (semula).
drop policy if exists "role_update" on public.approval_requests;
create policy "role_update" on public.approval_requests
  for update to authenticated
  using (
    public.current_role() = any (array['OWNER','ACCOUNTANT'])
    or (
      public.current_role() = 'MANAGER'
      and payload is not null
      and payload->>'requesterId' = auth.uid()::text
    )
  )
  with check (
    public.current_role() = any (array['OWNER','ACCOUNTANT'])
    or (
      public.current_role() = 'MANAGER'
      and payload is not null
      and payload->>'requesterId' = auth.uid()::text
    )
  );

-- 2b) Trigger guard status: Manager DIKECUALIKAN hanya utk 2 status
--     realisasinya sendiri ('Direalisasikan Manager', 'Selesai').
--     Persetujuan ('Disetujui'/'Disetujui Owner') tetap Owner-only.
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
  -- v1.1: Manager = eksekutor pengeluaran -> boleh membawa realisasi sendiri
  if v_role = 'MANAGER'
     and new.status in ('Direalisasikan Manager','Selesai') then
    return coalesce(new, old);
  end if;
  if new.status in ('Disetujui','Disetujui Owner','Direalisasikan Manager','Selesai') then
    raise exception 'Hanya Owner yang dapat mengubah status pengajuan menjadi "%"', new.status
      using errcode = '42501';
  end if;
  return coalesce(new, old);
end;
$$;

-- 3) Bukti pembayaran: Manager boleh update invoice (menyimpan payments
--    'Menunggu Verifikasi' di payload). Verifikasi/tolak pembayaran & alur
--    cicilan tetap lewat Accountant (gate UI/store tidak berubah).
drop policy if exists "role_update" on public.invoices;
create policy "role_update" on public.invoices
  for update to authenticated
  using (public.current_role() = any (array['OWNER','ACCOUNTANT','MANAGER']))
  with check (public.current_role() = any (array['OWNER','ACCOUNTANT','MANAGER']));

-- 3b) Jaga-jaga: pembatalan invoice tetap Owner-only, walau UPDATE sudah terbuka.
create or replace function public.guard_invoice_cancel()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
begin
  v_role := public.current_role();
  if coalesce(old.status,'') <> 'Dibatalkan'
     and new.status = 'Dibatalkan'
     and v_role <> 'OWNER' then
    raise exception 'Hanya Owner yang dapat membatalkan invoice.'
      using errcode = '42501';
  end if;
  return coalesce(new, old);
end;
$$;

drop trigger if exists guard_invoice_cancel on public.invoices;
create trigger guard_invoice_cancel
  before update of status on public.invoices
  for each row execute function public.guard_invoice_cancel();

-- ----------------------------------------------------------------------------
-- VERIFIKASI (jalankan terpisah bila perlu)
-- ----------------------------------------------------------------------------
-- a) Policy aktif (lpj_reports harus punya role_read dgn MANAGER;
--    approval_requests & invoices role_update memuat MANAGER):
--    select tablename, policyname, cmd, roles
--    from pg_policies
--    where schemaname='public'
--      and tablename in ('lpj_reports','approval_requests','invoices')
--    order by tablename, policyname;
--
-- b) Trigger guard (harus ada guard_approval_status & guard_invoice_cancel):
--    select trigger_name, event_object_table
--    from information_schema.triggers
--    where trigger_schema='public'
--      and trigger_name in ('guard_approval_status','guard_invoice_cancel');
-- ============================================================================
