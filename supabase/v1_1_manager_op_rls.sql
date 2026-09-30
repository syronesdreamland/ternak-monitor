-- ============================================================================
-- PATCH RLS 2026-09-30 — v1.1 ALIGNMENT: MANAGER UPDATE + DELETE DATA OPERASIONAL
--
-- Latar belakang:
--   Revisi v1.1 "two pillars" (2026-09-28) menetapkan Manager sebagai
--   eksekutor & pengelola data operasional. Frontend (permissions.ts v1.1)
--   sudah memberi Manager canEditModule/canDelete untuk modul operasional,
--   tetapi RLS database masih membatasi UPDATE/DELETE untuk OWNER saja.
--   Akibatnya edit/hapus ternak oleh Manager gagal DIAM-DIAM saat push
--   (RLS reject), lalu data muncul kembali setelah refresh.
--
-- Perubahan (idempotent — aman dijalankan berulang):
--   Tabel operasional (blok A schema.sql, KECUALI notifications yang punya
--   policy khusus): policy "role_update" & "role_delete" diperluas dari
--   OWNER saja -> OWNER atau MANAGER.
--
-- TIDAK diubah:
--   - Tabel keuangan (sales_records, lpj_reports, approval_requests,
--     purchase_orders): koreksi (edit/hapus) tetap Owner/Accountant,
--     sesuai dokumen v1.1 ("Edit/hapus data transaksi tetap terbatas").
--   - INSERT, SELECT, dan semua policy lain.
-- ============================================================================

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
