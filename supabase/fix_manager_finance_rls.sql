-- ============================================================================
-- FIX PRODUCTION 2026-09-25: Finance-control workflow untuk MANAGER & OWNER
--
-- Masalah diverifikasi via REST probe production:
--   1) MANAGER INSERT approval_requests -> 42501 RLS (pengajuan dana Manager
--      tidak pernah sampai ke Owner; hanya tersimpan di localStorage-nya).
--   2) MANAGER SELECT approval_requests -> kosong (tidak bisa lihat status
--      pengajuannya sendiri).
--   3) MANAGER INSERT invoices -> 42501 RLS (invoice buatan Manager gagal sync).
--
-- Prinsip:
--   - MANAGER boleh MEMBUAT pengajuan dana/invoice (workflow sudah didesain
--     begitu di financialDocuments.ts) dan membaca statusnya, TETAPI tetap
--     tidak boleh memverifikasi/menyetujui/mengubah/menghapus (tetap di
--     ACCOUNTANT/OWNER).
--   - MANAGER diberi akses SELECT terbatas pada dokumen keuangan read-only:
--     invoices + financial_transactions (dasar tampilan Laporan Laba Rugi).
--     Tabel keuangan sensitif lain (sales_records, cash_transactions,
--     lpj_reports) tetap tertutup untuk Manager.
--   - approval_requests: UPDATE status tetap OWNER+ACCOUNTANT. Aman: Manager
--     tidak punya jalur menaikkan status approval.
--
-- Idempotent: aman dijalankan berulang.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- A) approval_requests (tabel dokumen pengajuan dana findoc + legacy approvals)
-- ---------------------------------------------------------------------------
drop policy if exists "role_read" on public.approval_requests;
drop policy if exists "role_insert" on public.approval_requests;
drop policy if exists "role_update" on public.approval_requests;
drop policy if exists "role_delete" on public.approval_requests;

create policy "role_read" on public.approval_requests
  for select to authenticated
  using (public.current_role() = any (array['OWNER','ACCOUNTANT','MANAGER']));

create policy "role_insert" on public.approval_requests
  for insert to authenticated
  with check (public.current_role() = any (array['OWNER','ACCOUNTANT','MANAGER']));

create policy "role_update" on public.approval_requests
  for update to authenticated
  using (public.current_role() = any (array['OWNER','ACCOUNTANT']))
  with check (public.current_role() = any (array['OWNER','ACCOUNTANT']));

create policy "role_delete" on public.approval_requests
  for delete to authenticated
  using (public.current_role() = any (array['OWNER','ACCOUNTANT']));

-- ---------------------------------------------------------------------------
-- B) invoices: beri MANAGER insert + read (dokumen sendiri ikut alur approval;
--    verifikasi/cicilan/pembatalan tetap ACCOUNTANT/OWNER)
-- ---------------------------------------------------------------------------
drop policy if exists "role_read" on public.invoices;
drop policy if exists "role_insert" on public.invoices;
drop policy if exists "role_update" on public.invoices;
drop policy if exists "role_delete" on public.invoices;

create policy "role_read" on public.invoices
  for select to authenticated
  using (public.current_role() = any (array['OWNER','ACCOUNTANT','MITRA','MANAGER']));

create policy "role_insert" on public.invoices
  for insert to authenticated
  with check (public.current_role() = any (array['OWNER','ACCOUNTANT','MANAGER']));

create policy "role_update" on public.invoices
  for update to authenticated
  using (public.current_role() = any (array['OWNER','ACCOUNTANT']))
  with check (public.current_role() = any (array['OWNER','ACCOUNTANT']));

create policy "role_delete" on public.invoices
  for delete to authenticated
  using (public.current_role() = any (array['OWNER','ACCOUNTANT']));

-- ---------------------------------------------------------------------------
-- C) financial_transactions + purchase_orders: read-only untuk MANAGER
--    (dasar tampilan Laporan Laba Rugi / monitoring pembelian). Tanpa INSERT/
--    UPDATE/DELETE - buku kas tetap keuangan.
-- ---------------------------------------------------------------------------
drop policy if exists "role_read" on public.financial_transactions;
create policy "role_read" on public.financial_transactions
  for select to authenticated
  using (public.current_role() = any (array['OWNER','ACCOUNTANT','MANAGER']));

drop policy if exists "role_read" on public.purchase_orders;
create policy "role_read" on public.purchase_orders
  for select to authenticated
  using (public.current_role() = any (array['OWNER','ACCOUNTANT','MANAGER']));
