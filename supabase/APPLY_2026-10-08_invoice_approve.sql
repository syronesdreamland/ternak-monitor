-- APPLY_2026-10-08_invoice_approve.sql
-- ============================================================
-- Fitur: Owner menyetujui/menolak bukti pembayaran invoice
-- ============================================================
-- Laporan Alif 2026-10-08: setelah Manager membuat invoice, Owner tidak
-- punya fitur menyetujui. Verifikasi pembayaran sebelumnya hanya bisa
-- dilakukan ACCOUNTANT (verifyPayment requireRole(['ACCOUNTANT'])).
-- Owner juga harus bisa memverifikasi bukti bayar (monitor & approval,
-- dua pilar v1.1).
--
-- Sisi DB tidak butuh perubahan policy: role_update invoices sudah
-- memuat OWNER (File D). Trigger guard_invoice_cancel hanya melarang
-- non-Owner menulis status 'Dibatalkan' — status 'Lunas' bebas.
-- Trigger audit_db_logs memang mencatat perubahan payment payload.

-- (Opsional) bila ingin memperketat: tidak ada perubahan di file ini
-- selain verifikasi. SQL hanya idempotent-check.

-- VERIFIKASI setelah run (SQL Editor):
-- select tablename, policyname, cmd, roles
--   from pg_policies
--  where tablename = 'invoices'
--    and policyname = 'role_update';
-- Expect: 1 row, cmd=UPDATE, roles={authenticated}, with check berisi OWNER.

-- Verifikasi guard:
-- select tgname from pg_trigger
--  where tgrelid = 'public.invoices'::regclass and not tgisinternal;
-- Expect: guard_invoice_cancel aktif.
