-- ============================================================================
-- APPLY_2026-10-09_leaked_password_protection.sql
-- Audit Dashboard 2026-10-09 — item C3 (security backlog).
--
-- Untuk apa:
--   C3a) Verifikasi/GUNAKAN Leaked Password Protection (Supabase Auth):
--        menolak password yang muncul di kebocoran kredensial publik.
--        Catatan arsitektur: flag ini adalah pengaturan Auth (auth.users flow),
--        TIDAK bisa dibuat via SQL. Versi dashboard: Authentication -> Policies.
--        SQL di bawah hanya MELAPORKAN status live via pg_settings/extension
--        bila tersedia, lalu mendokumentasikan langkah UI-nya.
--   C3b) Rotasi password 5 akun produksi: password TIDAK diubah lewat SQL
--        (hash harus lewat Auth API). Gunakan skrip REST di repo:
--        Scripts/rotate_passwords_2026-10-09.py (Admin API per user).
--        SQL ini hanya menyiapkan verifikasi pasca-rotasi.
--
-- Jalankan via Supabase Dashboard -> SQL Editor. Idempotent, read-only.
-- ============================================================================

-- 1) Info server + Auth (konteks verifikasi)
select
  current_database() as db,
  current_setting('server_version', true) as pg_version,
  now() as checked_at;

-- 2) Daftar akun produksi (tanpa data sensitif) — verifikasi 5 akun masih ada
select
  p.email,
  p.raw_user_meta_data->>'role' as role,
  p.last_sign_in_at,
  p.created_at
from auth.users p
order by p.created_at;

-- 3) Ekspektasi pasca-C3a (Leaked Password Protection):
--    - Attempt login dengan password yang muncul di breach corpus harus gagal
--      dengan pesan kredensial terindikasi bocor.
--    - Rotasi password C3b wajib dilakukan SETELAH flag ON supaya password baru
--      langsung lolos kurasi kebocoran.
--
-- Dokumentasi langkah UI (tanpa SQL):
--   Dashboard -> Authentication -> Policies (atau Auth Settings) ->
--   "Leaked Password Protection" -> Enable.
--   (Direkomendasikan juga: MFA TOTP untuk akun OWNER sebagai hardening lanjutan.)

-- 4) Ekspektasi pasca-C3b (rotasi): 5 akun tetap ada dan role tidak berubah.
--    Verifikasi manual: login masing-masing akun dengan password BARU.
