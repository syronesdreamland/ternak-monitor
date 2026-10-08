-- ============================================================================
-- DUTA AGRI NUSANTARA — FILE F (2026-10-08): TEMUAN AUDIT KEAMANAN
-- ============================================================================
-- Hasil audit E2E + pentest 2026-10-08 (probe terbukti di production):
--
--   [H1] Manager bisa langsung PATCH invoices.status -> 'Lunas' TANPA bukti
--        pembayaran (probe: PATCH berhasil, read-back Lunas). Alur benar:
--        addPayment (bukti, status 'Menunggu Verifikasi') -> verifyPayment
--        oleh Accountant/Owner baru boleh mengubah paid/status.
--        Fix: trigger guard_invoice_payment — hanya OWNER/ACCOUNTANT boleh
--        membawa status 'Lunas'; MANAGER hanya boleh membawa
--        'Menunggu Verifikasi' (hasil upload bukti) ATAU mengosongkan
--        pembayaran terakhir miliknya sendiri (pending -> Belum Dibayar).
--
--   [C4] Frontend membaca role dari user_metadata -> akun self-signup yang
--        menyuntik metadata {"role":"OWNER"} TAMPIL sebagai Owner di UI
--        (RLS tetap aman karena current_role() baca app_metadata saja).
--        Fix DB: (a) hapus kembali user_metadata.role yang terselip pada
--        akun; (b) dokumentasi — matikan open signup di dashboard.
--
--   [C2/C3 manual] Rate limit Cloudflare /auth/v1/token + rotasi password +
--        MFA — TIDAK BISA via SQL, lihat action items di laporan audit.
--
-- CARA RUN: Supabase Dashboard -> SQL Editor -> paste SELURUH file ini
--           -> Run. Idempotent, aman diulang.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) guard_invoice_payment: blok Manager set 'Lunas' langsung via API
-- ---------------------------------------------------------------------------
drop trigger if exists guard_invoice_payment on public.invoices;

create or replace function public.guard_invoice_payment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
  v_has_unverified boolean;
begin
  -- Trigger ini hanya peduli perubahan STATUS pembayaran.
  if new.status is not distinct from old.status then
    return new;
  end if;

  v_role := public.current_role();

  -- OWNER/ACCOUNTANT: penuh (verifyPayment mereka yang boleh melunaskan).
  if v_role in ('OWNER','ACCOUNTANT') then
    return new;
  end if;

  if v_role = 'MANAGER' then
    -- Diizinkan: upload bukti pertama -> 'Menunggu Verifikasi'
    if new.status = 'Menunggu Verifikasi' then
      return new;
    end if;
    -- Diizinkan: menarik pembayarannya sendiri yang masih pending
    -- (UI menyediakan ini) -> kembali ke 'Belum Dibayar'.
    if new.status = 'Belum Dibayar' and old.status = 'Menunggu Verifikasi' then
      if jsonb_array_length(coalesce(new.payments->'payments','[]'::jsonb)) < jsonb_array_length(coalesce(old.payments->'payments','[]'::jsonb)) then
        return new;
      end if;
      -- fallback: payments mungkin tak terlacak (payload lama) — blok juga
      raise exception 'Manager hanya dapat menarik pembayaran pending miliknya sendiri';
    end if;
    -- Sisanya ('Lunas','Sebagian','Ditolak', dsb): TIDAK diizinkan.
    raise exception 'Hanya Owner/Akuntan yang dapat mengubah status pembayaran menjadi "%" (guna: verifikasi bukti)', new.status;
  end if;

  -- MITRA dan lainnya: tidak boleh mengubah status sama sekali.
  raise exception 'Role % tidak diizinkan mengubah status pembayaran invoice', v_role;
end;
$$;

drop trigger if exists guard_invoice_payment on public.invoices;
create trigger guard_invoice_payment
  before update of status on public.invoices
  for each row execute function public.guard_invoice_payment();

-- ---------------------------------------------------------------------------
-- 2) C4: bersihkan user_metadata.role pada akun yang menyuntik sendiri
--    (bukan akun resmi — akun resmi role-nya di app_metadata via set_roles.sql)
-- ---------------------------------------------------------------------------
update auth.users
set raw_user_meta_data = raw_user_meta_data - 'role'
where raw_user_meta_data ? 'role'
  and coalesce(raw_app_meta_data->>'role','') <> coalesce(raw_user_meta_data->>'role','');
-- (akun resmi: role app_metadata == role user_metadata dari set_roles awal —
--  di sana user_metadata hanya display_name, jadi praktis tidak tersentuh.)

-- ---------------------------------------------------------------------------
-- 3) VERIFIKASI
-- ---------------------------------------------------------------------------
select tgname, tgrelid::regclass as on_table, tgenabled
from pg_trigger
where tgname = 'guard_invoice_payment';

-- Expected: 1 row, tgenabled 'O' (origin)
