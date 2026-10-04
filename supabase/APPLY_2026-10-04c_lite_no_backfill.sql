-- ============================================================================
-- FILE C-LITE (2026-10-04) — versi ringkas tanpa backfill
-- (tabel livestock & financial_transactions masih kosong, backfill tidak perlu)
--
-- Isi:
--   1) Manager boleh INSERT sales_records / purchase_orders / lpj_reports
--   2) Manager boleh UPDATE purchase_orders / lpj_reports
--   3) Kolom display: livestock.location_name + financial_transactions.location_name
--
-- CARA RUN: Supabase Dashboard -> SQL Editor -> New query ->
--           upload/paste SELURUH isi file ini (pastikan dari FILE, bukan
--           copy dari pesan chat) -> Run. Idempotent, aman diulang.
-- ============================================================================

-- 1+2) Policy Manager
drop policy if exists "role_insert" on public.sales_records;
create policy "role_insert" on public.sales_records
  for insert to authenticated
  with check (public.current_role() = any (array['OWNER','ACCOUNTANT','MANAGER']));

drop policy if exists "role_insert" on public.purchase_orders;
create policy "role_insert" on public.purchase_orders
  for insert to authenticated
  with check (public.current_role() = any (array['OWNER','ACCOUNTANT','MANAGER']));

drop policy if exists "role_update" on public.purchase_orders;
create policy "role_update" on public.purchase_orders
  for update to authenticated
  using (public.current_role() = any (array['OWNER','ACCOUNTANT','MANAGER']))
  with check (public.current_role() = any (array['OWNER','ACCOUNTANT','MANAGER']));

drop policy if exists "role_insert" on public.lpj_reports;
create policy "role_insert" on public.lpj_reports
  for insert to authenticated
  with check (public.current_role() = any (array['OWNER','ACCOUNTANT','MANAGER']));

drop policy if exists "role_update" on public.lpj_reports;
create policy "role_update" on public.lpj_reports
  for update to authenticated
  using (public.current_role() = any (array['OWNER','ACCOUNTANT','MANAGER']))
  with check (public.current_role() = any (array['OWNER','ACCOUNTANT','MANAGER']));

-- 3) Kolom display (nullable, idempotent)
alter table public.livestock add column if not exists location_name text;
alter table public.financial_transactions add column if not exists location_name text;
