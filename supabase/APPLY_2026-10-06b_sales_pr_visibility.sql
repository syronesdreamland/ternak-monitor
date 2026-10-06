-- ============================================================================
-- APPLY 2026-10-06b (FILE E) — VISIBILITAS MANAGER: sales_records & purchase_requests
--
-- Hasil probe E2E production 2026-10-06 (satu jam setelah File D):
--   1) sales_records: INSERT oleh Manager = 201 SUKSES, tetapi row-nya TIDAK
--      TERLIHAT oleh Manager sendiri (role_read cuma OWNER/ACCOUNTANT).
--      Gejala: penjualan yang diinput Manager "hilang" setelah refresh di HP
--      Manager, padahal muncul di device Owner. (403 pada probe awal hanyalah
--      artefak return=representation — row baru tak terlihat.)
--   2) purchase_requests: role_read cuma OWNER/ACCOUNTANT (sisa policy lama) —
--      Manager tidak bisa melihat PR siapa pun termasuk buatannya sendiri;
--      UPDATE/DELETE (alur Ajukan/Edit draft/Hapus) juga diblok, padahal UI
--      PurchaseRequestView menyediakan semua tombol itu (modul Owner/Manager/
--      Accountant).
--
-- Ini kelas bug yang sama dengan C2 (lpj_reports, sudah difix File D): UI
-- mengizinkan, DB menyembunyikan/menolak senyap.
--
-- Yang diubah File E:
--   - sales_records     : role_read   +MANAGER (insert sudah benar dari File C)
--   - purchase_requests : role_read/insert/update/delete +MANAGER
--     (alur PR = eksekusi pembelian operasional, bukan keputusan dana Owner;
--      setujui/tolak PR tetap bisa dilakukan Accountant/Owner seperti semula)
--
-- Yang TIDAK diubah:
--   - sales_records UPDATE/DELETE tetap OWNER/ACCOUNTANT (void penjualan di UI
--     memang Owner-only; koreksi penjualan via Owner/Accountant).
--   - Semua guard File D (guard_approval_status, guard_invoice_cancel) utuh.
--
-- Negative test (harus tetap GAGAL utk Manager): void/batalkan penjualan,
-- approve pengajuan dana, batal invoice, update transaksi kas & buku besar.
--
-- CARA RUN: Supabase Dashboard -> SQL Editor -> New query ->
--           upload/paste SELURUH isi file ini (dari FILE) -> Run. Idempotent.
-- ============================================================================

-- 1) sales_records: Manager harus bisa MELIHAT hasil inputnya sendiri
drop policy if exists "role_manage" on public.sales_records;
drop policy if exists "role_read" on public.sales_records;
drop policy if exists "role_insert" on public.sales_records;
create policy "role_read" on public.sales_records
  for select to authenticated
  using (public.current_role() = any (array['OWNER','ACCOUNTANT','MANAGER']));

create policy "role_insert" on public.sales_records
  for insert to authenticated
  with check (public.current_role() = any (array['OWNER','ACCOUNTANT','MANAGER']));

-- role_update / role_delete sales_records TIDAK disentuh (tetap OWNER/ACCOUNTANT).

-- 2) purchase_requests: alur PR penuh untuk Manager (eksekusi pembelian)
drop policy if exists "role_manage" on public.purchase_requests;
drop policy if exists "role_read" on public.purchase_requests;
drop policy if exists "role_insert" on public.purchase_requests;
drop policy if exists "role_update" on public.purchase_requests;
drop policy if exists "role_delete" on public.purchase_requests;

create policy "role_read" on public.purchase_requests
  for select to authenticated
  using (public.current_role() = any (array['OWNER','ACCOUNTANT','MANAGER']));

create policy "role_insert" on public.purchase_requests
  for insert to authenticated
  with check (public.current_role() = any (array['OWNER','ACCOUNTANT','MANAGER']));

create policy "role_update" on public.purchase_requests
  for update to authenticated
  using (public.current_role() = any (array['OWNER','ACCOUNTANT','MANAGER']))
  with check (public.current_role() = any (array['OWNER','ACCOUNTANT','MANAGER']));

create policy "role_delete" on public.purchase_requests
  for delete to authenticated
  using (public.current_role() = any (array['OWNER','ACCOUNTANT','MANAGER']));

-- ----------------------------------------------------------------------------
-- VERIFIKASI (jalankan terpisah bila perlu)
-- ----------------------------------------------------------------------------
-- a) Policy aktif:
--    select tablename, policyname, cmd, roles
--    from pg_policies
--    where schemaname='public'
--      and tablename in ('sales_records','purchase_requests')
--    order by tablename, policyname;
--    role_read sales_records & purchase_requests harus memuat MANAGER.
--
-- b) Probe manual (SQL Editor, ganti JWT Aziz — atau biarkan probe E2E agent):
--    - Manager input penjualan -> row muncul di list-nya sendiri & device lain.
--    - Manager buat PR -> Ajukan -> list tetap terlihat.
-- ============================================================================
