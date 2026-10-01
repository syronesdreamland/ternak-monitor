-- ============================================================================
-- FIX PRODUCTION 2026-10-01: Edit & batalkan pengajuan dana oleh pembuatnya
--
-- Konteks: fitur baru di FinancialDocumentsView — pembuat pengajuan (umumnya
-- MANAGER) dapat mengedit atau membatalkan pengajuannya sendiri SELAMA status
-- masih 'Diajukan'. Store aplikasi (financialDocuments.ts) sudah menegakkan
-- aturan ini, tetapi RLS production melarang MANAGER UPDATE approval_requests
-- (fix_manager_finance_rls.sql) sehingga perubahan akan GAGAL SYNC senyap.
--
-- Solusi: policy UPDATE tambahan yang persis (defense in depth di level DB):
--   - requester_update_own_pending: pemilik dokumen (payload->>'requesterId'
--     = auth.uid()) boleh mengubah dokumen miliknya yang masih 'Diajukan'.
--     WITH CHECK membatasi status hasil: 'Diajukan' (edit konten) atau
--     'Dibatalkan' (pembatalan). Blokir: edit setelah diverifikasi/disetujui,
--     mengubah pemilik dokumen, atau memalsukan status di payload.
--   - Owner/Accountant tetap bisa update apa pun (policy role_update).
--
-- Idempotent: aman dijalankan berulang.
-- ============================================================================

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
