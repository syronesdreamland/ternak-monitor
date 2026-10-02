-- ============================================================================
-- APPLY 2026-10-02b — FIX SINKRONISASI MODUL AGRO (kebun, ikan, satwa, inventory)
-- + LAPORAN HARIAN & MUTASI STOK & DISPLAY NAME SALES/DEATH
--
-- Root cause (audit dataSync.ts vs schema.sql, 2026-10-02):
--   9 tabel punya kolom "display name" di whitelist push dataSync.ts TAPI kolom
--   itu tidak ada di database -> setiap INSERT/UPDATE dari aplikasi gagal senyap
--   dengan PGRST204 "Could not find the 'x_name' column of 'y' in the schema
--   cache". Gejala: data tidak muncul di perangkat lain, hilang setelah refresh.
--     crop_records.location_name, crop_activities.crop_name,
--     ponds.location_name, water_quality_records.pond_name,
--     fish_feed_logs.pond_name, fish_harvest_records.pond_name,
--     wildlife_records.location_name, inventory_items.location_name,
--     stock_mutations.item_name
--   Selain itu DailyReport (laporan harian) punya locationName yang ikut
--   toRow => push daily_reports juga kena PGRST204 bila kolom tidak ditambah.
--
-- Pilihan desain: kolom disimpan denormalized di DB (bukan dibuang dari
-- whitelist) supaya nilai tetap tersistem antar perangkat dan tidak perlu
-- JOIN saat pull. Semua kolom nullable/beri default aman.
--
-- CARA APPLY: Supabase Dashboard -> SQL Editor -> paste SELURUH file -> Run.
-- Idempotent: aman dijalankan berulang.
-- Jalankan SETELAH APPLY_2026-10-02_sync_fix.sql (RLS).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- A) Kolom display name yang hilang (nullable, tanpa backfill wajib)
-- ----------------------------------------------------------------------------
alter table public.crop_records          add column if not exists location_name text;
alter table public.crop_activities       add column if not exists crop_name text;
alter table public.ponds                 add column if not exists location_name text;
alter table public.water_quality_records add column if not exists pond_name text;
alter table public.fish_feed_logs        add column if not exists pond_name text;
alter table public.fish_harvest_records  add column if not exists pond_name text;
alter table public.wildlife_records      add column if not exists location_name text;
alter table public.inventory_items       add column if not exists location_name text;
alter table public.stock_mutations       add column if not exists item_name text;

-- ----------------------------------------------------------------------------
-- B) DailyReport.locationName -> daily_reports.location_name
--    (daily_reports punya location_id, tapi UI menampilkan nama lokasi;
--    toRow mengirim location_name -> tanpa kolom ini push laporan harian gagal)
-- ----------------------------------------------------------------------------
alter table public.daily_reports         add column if not exists location_name text;

-- ----------------------------------------------------------------------------
-- C) Backfill display name dari tabel master (idempotent)
-- ----------------------------------------------------------------------------
update public.crop_records c
  set location_name = l.name
  from public.locations l
  where c.location_id = l.id and (c.location_name is null or c.location_name = '');

update public.ponds p
  set location_name = l.name
  from public.locations l
  where p.location_id = l.id and (p.location_name is null or p.location_name = '');

update public.wildlife_records w
  set location_name = l.name
  from public.locations l
  where w.location_id = l.id and (w.location_name is null or w.location_name = '');

update public.inventory_items i
  set location_name = l.name
  from public.locations l
  where i.location_id = l.id and (i.location_name is null or i.location_name = '');

update public.stock_mutations m
  set item_name = i.name
  from public.inventory_items i
  where m.item_id = i.id and (m.item_name is null or m.item_name = '');

update public.crop_activities a
  set crop_name = c.name
  from public.crop_records c
  where a.crop_id = c.id and (a.crop_name is null or a.crop_name = '');

update public.water_quality_records q
  set pond_name = p.name
  from public.ponds p
  where q.pond_id = p.id and (q.pond_name is null or q.pond_name = '');

update public.fish_feed_logs f
  set pond_name = p.name
  from public.ponds p
  where f.pond_id = p.id and (f.pond_name is null or f.pond_name = '');

update public.fish_harvest_records h
  set pond_name = p.name
  from public.ponds p
  where h.pond_id = p.id and (h.pond_name is null or h.pond_name = '');

-- ----------------------------------------------------------------------------
-- D) PULL-LEVEL (kosmetik-fungsional): nama lokasi di modul ternak utama
--    Tidak membuat sync gagal, tapi nama lokasi jadi kosong di perangkat lain
--    setelah data di-pull (SalesRecord, DeathRecord, FeedInventory, DailyReport
--    menampilkan locationName dari data tersinkron).
-- ----------------------------------------------------------------------------
alter table public.sales_records         add column if not exists location_name text;
alter table public.death_records         add column if not exists location_name text;
alter table public.transfer_records      add column if not exists origin_location_name text;
alter table public.transfer_records      add column if not exists dest_location_name text;
alter table public.feed_inventory        add column if not exists location_name text;

update public.sales_records s
  set location_name = l.name
  from public.locations l
  where s.location_id = l.id and (s.location_name is null or s.location_name = '');

update public.death_records d
  set location_name = l.name
  from public.locations l
  where d.location_id = l.id and (d.location_name is null or d.location_name = '');

update public.transfer_records t
  set origin_location_name = lo.name,
      dest_location_name   = ld.name
  from public.locations lo, public.locations ld
  where t.origin_location_id = lo.id and t.dest_location_id = ld.id
    and (t.origin_location_name is null or t.dest_location_name is null);

update public.feed_inventory f
  set location_name = l.name
  from public.locations l
  where f.location_id = l.id and (f.location_name is null or f.location_name = '');

update public.daily_reports r
  set location_name = l.name
  from public.locations l
  where r.location_id = l.id and (r.location_name is null or r.location_name = '');

-- ----------------------------------------------------------------------------
-- E) VERIFIKASI: jalankan terpisah bila perlu.
--    Semua kolom di bawah harus muncul:
-- ----------------------------------------------------------------------------
-- select table_name, column_name from information_schema.columns
-- where table_schema='public' and column_name in
--   ('location_name','crop_name','pond_name','item_name',
--    'origin_location_name','dest_location_name')
-- order by table_name;
