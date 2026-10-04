-- ============================================================================
-- APPLY 2026-10-04 — FILE C: PERBAIKAN SISA BUG RLS + KOLOM DISPLAY (v1.1)
--
-- Latar belakang (audit ulang + probe REST production, 2026-10-04):
--   Verifikasi 2026-10-03 (File A + File B) belum menutup semua celah.
--   Sisa masalah yang DIBUKTIKAN live di production:
--
--   1) Manager (inputer utama v1.1) di-BLOK RLS pada 3 tabel yang UI-nya
--      justru dia yang mengisi:
--        - sales_records       (Hasil Penjualan / POS Penjualan)  -> INSERT 403
--        - purchase_orders     (Buat PO)                          -> INSERT 403
--        - lpj_reports         (Buat LPJ)                         -> INSERT 403
--      Padahal permissions.ts v1.1: canCreate(MANAGER, modul tsb) = true.
--      Akibat: input gagal senyap saat push, hilang setelah refresh.
--
--   2) Manager melihat & mengedit Purchase Order (edit/ubah status/hapus Draft),
--      LPJ (edit/lanjut status/hapus), dan transaksi keuangan via FinanceView
--      (tombol Edit). UPDATE RLS ketiganya masih OWNER/ACCOUNTANT saja.
--
--   3) Kolom display name untuk modul ternak utama belum ada di DB:
--        livestock.location_name, financial_transactions.location_name
--      UI menampilkan nama lokasi dari field application-level ini, tetapi
--      nilainya tidak pernah tersistem ke DB -> di perangkat lain nama lokasi
--      kosong (padahal location_id benar).
--
--   TIDAK diubah: policy guard keputusan (approval/invoices/cash/financial)
--   sesuai two pillars v1.1. Purchase Requests tidak disentuh (sudah benar).
--
-- CARA APPLY: Supabase Dashboard -> SQL Editor -> paste SELURUH file -> Run.
-- Idempotent: aman dijalankan berulang. Jalankan SETELAH File A & File B.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) Manager boleh INSERT tabel kerjanya (sales / PO / LPJ)
-- ----------------------------------------------------------------------------
drop policy if exists "role_insert" on public.sales_records;
create policy "role_insert" on public.sales_records
  for insert to authenticated
  with check (public.current_role() = any (array['OWNER','ACCOUNTANT','MANAGER']));

drop policy if exists "role_insert" on public.purchase_orders;
create policy "role_insert" on public.purchase_orders
  for insert to authenticated
  with check (public.current_role() = any (array['OWNER','ACCOUNTANT','MANAGER']));

drop policy if exists "role_insert" on public.lpj_reports;
create policy "role_insert" on public.lpj_reports
  for insert to authenticated
  with check (public.current_role() = any (array['OWNER','ACCOUNTANT','MANAGER']));

-- ----------------------------------------------------------------------------
-- 2) Manager boleh UPDATE Purchase Order & LPJ (bukan keputusan approval;
--    alur status PO/LPJ adalah eksekusi operasional, sesuai v1.1 Manager =
--    eksekutor). Koreksi pengajuan dana sendiri (approval_requests) sudah
--    ditangani policy requester_update_own_pending (File A).
-- ----------------------------------------------------------------------------
drop policy if exists "role_update" on public.purchase_orders;
create policy "role_update" on public.purchase_orders
  for update to authenticated
  using (public.current_role() = any (array['OWNER','ACCOUNTANT','MANAGER']))
  with check (public.current_role() = any (array['OWNER','ACCOUNTANT','MANAGER']));

drop policy if exists "role_update" on public.lpj_reports;
create policy "role_update" on public.lpj_reports
  for update to authenticated
  using (public.current_role() = any (array['OWNER','ACCOUNTANT','MANAGER']))
  with check (public.current_role() = any (array['OWNER','ACCOUNTANT','MANAGER']));

-- DELETE PO/LPJ oleh Manager (hapus draft PO / LPJ salah input; UI sudah
-- menyediakan tombolnya untuk Manager sesuai matrix v1.1).
drop policy if exists "role_delete" on public.purchase_orders;
create policy "role_delete" on public.purchase_orders
  for delete to authenticated
  using (public.current_role() = any (array['OWNER','ACCOUNTANT','MANAGER']));

drop policy if exists "role_delete" on public.lpj_reports;
create policy "role_delete" on public.lpj_reports
  for delete to authenticated
  using (public.current_role() = any (array['OWNER','ACCOUNTANT','MANAGER']));

-- ----------------------------------------------------------------------------
-- 3) Kolom display name modul ternak utama (nullable, idempotent)
-- ----------------------------------------------------------------------------
alter table public.livestock              add column if not exists location_name text;
alter table public.financial_transactions add column if not exists location_name text;

-- Backfill dari master locations (idempotent)
update public.livestock l
  set location_name = loc.name
  from public.locations loc
  where l.location_id = loc.id and (l.location_name is null or l.location_name = '');

update public.financial_transactions f
  set location_name = loc.name
  from public.locations loc
  where f.location_id = loc.id and (f.location_name is null or f.location_name = '');

-- ----------------------------------------------------------------------------
-- 4) VERIFIKASI (jalankan terpisah bila perlu)
-- ----------------------------------------------------------------------------
-- a) Policy baru aktif:
--    select tablename, policyname, cmd, roles, qual
--    from pg_policies
--    where schemaname='public'
--      and tablename in ('sales_records','purchase_orders','lpj_reports')
--    order by tablename, policyname;
--    Harus menunjukkan role_insert/role_update dgn OWNER, ACCOUNTANT, MANAGER.
--
-- b) Kolom display baru:
--    select table_name, column_name from information_schema.columns
--    where table_schema='public'
--      and (table_name, column_name) in
--          (('livestock','location_name'),('financial_transactions','location_name'));
