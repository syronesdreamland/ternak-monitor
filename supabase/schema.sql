-- ============================================================================
-- DUTA AGRI NUSANTARA — Skema Data Terpusat (Tahap 2: DB Production)
-- Idempotent: aman dijalankan berulang.
-- RLS model:
--   OWNER      : full control semua tabel
--   MANAGER    : CRUD operasional (bukan keuangan, bukan user/system)
--   ACCOUNTANT : CRUD keuangan + view dashboard
--   MITRA      : read-only data ringkas
-- Role dibaca dari auth.users.app_metadata->>'role' (server-only).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 0) Helper: role user saat ini (dari app_metadata, fallback user_metadata)
-- ---------------------------------------------------------------------------
create or replace function public.current_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select raw_app_meta_data->>'role' from auth.users where id = auth.uid()),
    (select raw_user_meta_data->>'role' from auth.users where id = auth.uid()),
    'MITRA'
  );
$$;

-- ---------------------------------------------------------------------------
-- 1) profiles (kelola user)
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  role text not null default 'MITRA'
    check (role in ('OWNER','MANAGER','ACCOUNTANT','MITRA','ADMIN','USER','DEVELOPER')),
  location_ids text[] not null default '{}',
  status text not null default 'Aktif',
  phone text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Tambahkan kolom untuk tabel profiles lama yang dibuat setup.sql versi awal
alter table public.profiles add column if not exists phone text;
alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles add column if not exists updated_at timestamptz not null default now();

-- ---------------------------------------------------------------------------
-- 2) Master: locations & pens
-- ---------------------------------------------------------------------------
create table if not exists public.locations (
  id text primary key,
  name text not null,
  address text,
  pic_name text,
  pic_phone text,
  livestock_types text[] not null default '{}',
  pen_count int not null default 0,
  status text not null default 'Aktif',
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.pens (
  id text primary key,
  location_id text not null references public.locations(id) on delete cascade,
  name text not null,
  capacity int not null default 0,
  current_count int,
  notes text
);

-- ---------------------------------------------------------------------------
-- 3) Ternak: livestock + records terkait
-- ---------------------------------------------------------------------------
create table if not exists public.livestock (
  id text primary key,
  tag_id text not null,
  qr_code text,
  photo_url text,
  type text not null,
  breed text,
  gender text not null,
  dob date,
  estimated_age_months int,
  color_traits text,
  location_id text references public.locations(id),
  pen_id text references public.pens(id),
  ownership_status text,
  source text,
  entry_date date,
  acquisition_price numeric(14,2) default 0,
  selling_price numeric(14,2),
  initial_weight_kg numeric(8,2) default 0,
  current_weight_kg numeric(8,2) default 0,
  health_status text not null default 'Sehat',
  breeding_status text not null default 'Belum Dikawinkan',
  mother_id text,
  mother_tag text,
  father_id text,
  father_tag text,
  condition_category text not null default 'Baik',
  status text not null default 'Aktif',
  notes text,
  price_history jsonb not null default '[]',
  location_history jsonb not null default '[]',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  deleted_by text
);

create table if not exists public.weight_records (
  id text primary key,
  livestock_id text not null references public.livestock(id) on delete cascade,
  tag_id text,
  weigh_date date not null,
  weight_kg numeric(8,2) not null,
  previous_weight_kg numeric(8,2) default 0,
  gain_kg numeric(8,2) default 0,
  officer_name text,
  photo_url text,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.health_records (
  id text primary key,
  livestock_id text not null references public.livestock(id) on delete cascade,
  tag_id text,
  record_date date not null,
  condition text,
  symptoms text,
  action_taken text,
  medicine_name text,
  dosage text,
  officer_name text,
  vet_name text,
  follow_up_date date,
  photo_url text,
  status text,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.breeding_records (
  id text primary key,
  mother_id text references public.livestock(id),
  mother_tag text,
  father_id text references public.livestock(id),
  father_tag text,
  mating_date date,
  method text,
  preg_check_date date,
  preg_check_result text,
  preg_status text not null default 'Belum',
  est_birth_date date,
  actual_birth_date date,
  offspring_count int,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.birth_records (
  id text primary key,
  mother_id text references public.livestock(id),
  mother_tag text,
  offspring_id text,
  offspring_tag text,
  location_id text references public.locations(id),
  birth_date date not null,
  gender text,
  birth_weight_kg numeric(8,2) default 0,
  condition text,
  photo_url text,
  voided_at timestamptz,
  voided_by text,
  void_reason text,
  created_at timestamptz not null default now()
);

create table if not exists public.death_records (
  id text primary key,
  livestock_id text references public.livestock(id),
  tag_id text,
  death_date date not null,
  death_time text,
  location_id text references public.locations(id),
  suspected_cause text,
  symptoms_before text,
  handling_note text,
  chronology text,
  last_condition text,
  officer_name text,
  vet_name text,
  photo_url text,
  doc_url text,
  confirmed_by text,
  previous_livestock_state jsonb,
  voided_at timestamptz,
  voided_by text,
  void_reason text,
  created_at timestamptz not null default now()
);

create table if not exists public.transfer_records (
  id text primary key,
  livestock_id text not null references public.livestock(id) on delete cascade,
  tag_id text,
  origin_location_id text references public.locations(id),
  dest_location_id text references public.locations(id),
  transfer_date date not null,
  reason text,
  officer_name text,
  transport text,
  notes text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 4) Keuangan: sales, transactions, invoices
-- ---------------------------------------------------------------------------
create table if not exists public.sales_records (
  id text primary key,
  invoice_no text,
  date date not null,
  buyer_name text,
  buyer_phone text,
  livestock_ids text[] not null default '{}',
  weight_total_kg numeric(10,2) default 0,
  price_total numeric(14,2) default 0,
  acquisition_cost_total numeric(14,2),
  payment_method text,
  payment_status text not null default 'Belum Bayar',
  location_id text references public.locations(id),
  proof_url text,
  doc_url text,
  sales_rep text,
  transaction_status text not null default 'Draft',
  linked_finance_transaction_ids text[],
  pre_sale_livestock_snapshots jsonb,
  voided_at timestamptz,
  voided_by text,
  void_reason text,
  notes text,
  created_by text,
  created_at timestamptz not null default now()
);

create table if not exists public.feed_inventory (
  id text primary key,
  location_id text references public.locations(id),
  feed_type text not null,
  stock_qty numeric(12,2) default 0,
  stock_in numeric(12,2),
  stock_out numeric(12,2),
  unit text not null default 'kg',
  min_stock numeric(12,2) default 0,
  unit_price numeric(14,2) default 0,
  supplier text,
  archived_at timestamptz,
  archived_by text,
  updated_at timestamptz not null default now()
);

create table if not exists public.financial_transactions (
  id text primary key,
  invoice_no text,
  date date not null,
  type text not null check (type in ('income','expense')),
  category text,
  description text,
  location_id text references public.locations(id),
  amount numeric(14,2) not null default 0,
  payment_method text,
  payee_payer text,
  proof_url text,
  created_by text,
  notes text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 5) Laporan harian & notifikasi & audit
-- ---------------------------------------------------------------------------
create table if not exists public.daily_reports (
  id text primary key,
  date date not null,
  location_id text references public.locations(id),
  pop_initial int default 0,
  pop_purchase int default 0,
  pop_birth int default 0,
  pop_transfer_in int default 0,
  pop_sales int default 0,
  pop_death int default 0,
  pop_transfer_out int default 0,
  pop_final int default 0,
  healthy_count int default 0,
  sick_count int default 0,
  isolation_count int default 0,
  in_treatment_count int default 0,
  activities_text text,
  expenses_list jsonb not null default '[]',
  photos text[] not null default '{}',
  officer_notes text,
  report_status text not null default 'Draft',
  created_by text,
  submitted_at timestamptz,
  reviewed_by text,
  reviewed_at timestamptz,
  archived_at timestamptz,
  archived_by text,
  created_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id text primary key,
  title text not null,
  message text,
  severity text not null default 'info' check (severity in ('critical','warning','info')),
  category text,
  location_id text,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id text primary key,
  user_id text,
  user_name text,
  user_role text,
  module text,
  action text,
  target_id text,
  target_name text,
  before_value text,
  after_value text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 6) Divisi: kebun, perikanan, satwa
-- ---------------------------------------------------------------------------
create table if not exists public.crop_records (
  id text primary key,
  name text not null,
  division text not null,
  variety text,
  location_id text references public.locations(id),
  plot_area_m2 numeric(12,2) default 0,
  planted_date date,
  estimated_harvest_date date,
  status text not null default 'Persiapan',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.crop_activities (
  id text primary key,
  crop_id text references public.crop_records(id) on delete cascade,
  activity_type text not null,
  date date not null,
  officer_name text,
  material_used text,
  quantity numeric(12,2),
  unit text,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.garden_documents (
  id text primary key,
  doc_type text not null,
  title text not null,
  date date not null,
  party_name text,
  file_name text,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.ponds (
  id text primary key,
  name text not null,
  location_id text references public.locations(id),
  type text not null,
  species text,
  area_m2 numeric(12,2) default 0,
  volume_m3 numeric(12,2) default 0,
  stocking_date date,
  stocking_count int default 0,
  estimated_harvest_date date,
  status text not null default 'Persiapan',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.water_quality_records (
  id text primary key,
  pond_id text references public.ponds(id) on delete cascade,
  date date not null,
  ph numeric(5,2),
  dissolved_oxygen numeric(5,2),
  temperature numeric(5,2),
  ammonia numeric(5,2),
  nitrite numeric(5,2),
  officer_name text,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.fish_feed_logs (
  id text primary key,
  pond_id text references public.ponds(id) on delete cascade,
  date date not null,
  feed_type text,
  feed_amount_kg numeric(10,2) default 0,
  biomass_kg numeric(10,2) default 0,
  fcr numeric(6,3),
  officer_name text,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.fish_harvest_records (
  id text primary key,
  pond_id text references public.ponds(id) on delete cascade,
  harvest_date date not null,
  total_weight_kg numeric(12,2) default 0,
  total_fish_count int default 0,
  average_weight_kg numeric(8,2) default 0,
  buyer_name text,
  price_per_kg numeric(14,2) default 0,
  total_revenue numeric(14,2) default 0,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.wildlife_records (
  id text primary key,
  name text not null,
  category text not null,
  species text,
  count int default 0,
  location_id text references public.locations(id),
  acquisition_date date,
  health_status text not null default 'Sehat',
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.wildlife_feed_schedules (
  id text primary key,
  wildlife_id text references public.wildlife_records(id) on delete cascade,
  wildlife_name text,
  schedule_time text,
  feed_type text,
  feed_amount text,
  status text not null default 'Terjadwal',
  last_fed_at timestamptz,
  officer_name text,
  notes text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 7) Inventory, purchasing, operasional
-- ---------------------------------------------------------------------------
create table if not exists public.inventory_items (
  id text primary key,
  sku text,
  name text not null,
  category text not null,
  unit text not null default 'unit',
  stock_qty numeric(12,2) default 0,
  min_stock numeric(12,2) default 0,
  unit_price numeric(14,2) default 0,
  location_id text references public.locations(id),
  supplier text,
  updated_at timestamptz not null default now()
);

create table if not exists public.stock_mutations (
  id text primary key,
  item_id text references public.inventory_items(id) on delete cascade,
  type text not null check (type in ('Masuk','Keluar')),
  quantity numeric(12,2) not null default 0,
  date date not null,
  reason text,
  officer_name text,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.purchase_requests (
  id text primary key,
  request_no text,
  item_name text not null,
  category text,
  quantity numeric(12,2) not null default 1,
  unit text,
  reason text,
  requested_by text,
  request_date date not null,
  status text not null default 'Draft',
  approved_by text,
  approved_at timestamptz,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.purchase_orders (
  id text primary key,
  po_no text,
  supplier_name text,
  item_name text not null,
  quantity numeric(12,2) not null default 1,
  unit text,
  unit_price numeric(14,2) default 0,
  total_amount numeric(14,2) default 0,
  order_date date not null,
  expected_delivery_date date,
  status text not null default 'Draft',
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.tasks (
  id text primary key,
  title text not null,
  description text,
  assignee text,
  assignee_role text,
  due_date date,
  priority text not null default 'Sedang',
  status text not null default 'Belum Dimulai',
  related_module text,
  created_at timestamptz not null default now()
);

create table if not exists public.attendance_records (
  id text primary key,
  worker_name text not null,
  division text,
  date date not null,
  check_in_time text,
  check_out_time text,
  status text not null default 'Hadir',
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.kpi_scores (
  id text primary key,
  worker_name text not null,
  division text,
  period text not null,
  attendance_score numeric(5,2) default 0,
  productivity_score numeric(5,2) default 0,
  discipline_score numeric(5,2) default 0,
  total_score numeric(5,2) default 0,
  notes text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 8) Finance Control: kas, LPJ, approval, invoice
-- ---------------------------------------------------------------------------
create table if not exists public.cash_transactions (
  id text primary key,
  reference_no text,
  date date not null,
  type text not null check (type in ('Masuk','Keluar')),
  category text,
  description text,
  amount numeric(14,2) not null default 0,
  source_division text,
  payment_method text,
  officer_name text,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.lpj_reports (
  id text primary key,
  reference_no text,
  fund_request_id text,
  title text not null,
  division text,
  period_start date,
  period_end date,
  total_allocated numeric(14,2) default 0,
  total_spent numeric(14,2) default 0,
  remaining numeric(14,2) default 0,
  status text not null default 'Draft',
  items jsonb not null default '[]',
  submitted_by text,
  created_at timestamptz not null default now()
);

create table if not exists public.approval_requests (
  id text primary key,
  reference_no text,
  type text not null check (type in ('Pengajuan Dana','Purchase Order','LPJ','Invoice')),
  title text not null,
  requester text,
  requested_at timestamptz not null default now(),
  status text not null default 'Menunggu',
  approved_by text,
  approved_at timestamptz,
  notes text
);

create table if not exists public.invoices (
  id text primary key,
  invoice_no text not null,
  doc_type text not null default 'Invoice',
  party_name text,
  date date not null,
  due_date date,
  amount_total numeric(14,2) default 0,
  dp_amount numeric(14,2) default 0,
  paid_amount numeric(14,2) default 0,
  status text not null default 'Belum Bayar',
  description text,
  proof_urls text[] not null default '{}',
  created_by text,
  created_at timestamptz not null default now()
);

create table if not exists public.master_data (
  id text primary key,
  category text not null,
  name text not null,
  value text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Kolom payload (JSONB dokumen) untuk finance-control workflow:
-- fund requests disimpan di approval_requests.payload, invoice di invoices.payload.
-- Row dokumen = payload NOT NULL; row legacy approvals = payload NULL.
-- dataSync memfilter pull per-mapping (is null / not null) agar tidak saling
-- menimpa, dan mengisi kolom meta NOT NULL (type/title, invoice_no/date)
-- dari dokumen saat push agar constraint terpenuhi.
alter table public.invoices add column if not exists payload jsonb;
alter table public.approval_requests add column if not exists payload jsonb;

-- ---------------------------------------------------------------------------
-- 9) RLS: aktifkan di SEMUA tabel
-- ---------------------------------------------------------------------------
do $$
declare t record;
begin
  for t in
    select tablename from pg_tables
    where schemaname = 'public'
      and tablename in (
        'profiles','locations','pens','livestock','weight_records','health_records',
        'breeding_records','birth_records','death_records','transfer_records',
        'sales_records','feed_inventory','financial_transactions','daily_reports',
        'notifications','audit_logs','crop_records','crop_activities','garden_documents',
        'ponds','water_quality_records','fish_feed_logs','fish_harvest_records',
        'wildlife_records','wildlife_feed_schedules','inventory_items','stock_mutations',
        'purchase_requests','purchase_orders','tasks','attendance_records','kpi_scores',
        'cash_transactions','lpj_reports','approval_requests','invoices','master_data'
      )
  loop
    execute format('alter table public.%I enable row level security;', t.tablename);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 10) RLS policies (idempotent via drop-if-exists)
-- Granular sesuai permissions.ts:
--   INSERT  : op = OWNER+MANAGER; finance = OWNER+ACCOUNTANT; system = OWNER
--   UPDATE  : OWNER (op & finance sesuai dokumen: Manager edit X); notifications semua
--   DELETE  : OWNER saja (op), OWNER+ACCOUNTANT (finance)
--   SELECT  : op = semua role; finance = OWNER+ACCOUNTANT (+MITRA utk invoices)
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  -- A) Operasional umum
  foreach t in array array[
    'locations','pens','livestock','weight_records','health_records',
    'breeding_records','birth_records','death_records','transfer_records',
    'feed_inventory','daily_reports','crop_records','crop_activities',
    'garden_documents','ponds','water_quality_records','fish_feed_logs',
    'fish_harvest_records','wildlife_records','wildlife_feed_schedules',
    'stock_mutations','tasks','attendance_records','kpi_scores','notifications'
  ]
  loop
    execute format('drop policy if exists "role_manage" on public.%I;', t);
    execute format('drop policy if exists "role_read" on public.%I;', t);
    execute format('drop policy if exists "role_insert" on public.%I;', t);
    execute format('drop policy if exists "role_update" on public.%I;', t);
    execute format('drop policy if exists "role_delete" on public.%I;', t);
    execute format($p$
      create policy "role_read" on public.%I
      for select to authenticated
      using (public.current_role() = any (array['OWNER','MANAGER','ACCOUNTANT','MITRA']));
    $p$, t);
    execute format($p$
      create policy "role_insert" on public.%I
      for insert to authenticated
      with check (public.current_role() = any (array['OWNER','MANAGER']));
    $p$, t);
    execute format($p$
      create policy "role_update" on public.%I
      for update to authenticated
      using (public.current_role() = 'OWNER')
      with check (public.current_role() = 'OWNER');
    $p$, t);
    execute format($p$
      create policy "role_delete" on public.%I
      for delete to authenticated
      using (public.current_role() = 'OWNER');
    $p$, t);
  end loop;

  -- B) Keuangan (v1.1): financial_transactions & cash_transactions punya policy
  --    khusus (Manager = inputer; Finance view-only) — lihat blok setelah loop.
  --    Sisanya: OWNER/ACCOUNTANT penuh; MANAGER & MITRA tanpa akses tulis,
  --    kecuali purchase_requests yang boleh di-INSERT Manager (v1.1).
  foreach t in array array[
    'sales_records',
    'lpj_reports','approval_requests','purchase_orders'
  ]
  loop
    execute format('drop policy if exists "role_manage" on public.%I;', t);
    execute format('drop policy if exists "role_read" on public.%I;', t);
    execute format('drop policy if exists "role_insert" on public.%I;', t);
    execute format('drop policy if exists "role_update" on public.%I;', t);
    execute format('drop policy if exists "role_delete" on public.%I;', t);
    execute format($p$
      create policy "role_read" on public.%I
      for select to authenticated
      using (public.current_role() = any (array['OWNER','ACCOUNTANT']));
    $p$, t);
    execute format($p$
      create policy "role_insert" on public.%I
      for insert to authenticated
      with check (public.current_role() = any (array['OWNER','ACCOUNTANT']));
    $p$, t);
    execute format($p$
      create policy "role_update" on public.%I
      for update to authenticated
      using (public.current_role() = any (array['OWNER','ACCOUNTANT']))
      with check (public.current_role() = any (array['OWNER','ACCOUNTANT']));
    $p$, t);
    execute format($p$
      create policy "role_delete" on public.%I
      for delete to authenticated
      using (public.current_role() = any (array['OWNER','ACCOUNTANT']));
    $p$, t);
  end loop;


  -- B3) notifications: notifikasi dibuat sistem dari aksi role mana pun;
  --      insert & update (mark-as-read) boleh semua authenticated.
  execute 'drop policy if exists "notif_insert" on public.notifications;';
  execute 'drop policy if exists "notif_update" on public.notifications;';
  execute $p$
    create policy "notif_insert" on public.notifications
    for insert to authenticated
    with check (true);
  $p$;
  execute $p$
    create policy "notif_update" on public.notifications
    for update to authenticated
    using (true)
    with check (true);
  $p$;
  -- B1b) v1.1 two pillars: financial_transactions & cash_transactions —
  --      Manager = inputer (INSERT), Owner = penuh, Accountant view-only.
  execute 'drop policy if exists "role_read" on public.financial_transactions;';
  execute 'drop policy if exists "role_insert" on public.financial_transactions;';
  execute 'drop policy if exists "role_update" on public.financial_transactions;';
  execute 'drop policy if exists "role_delete" on public.financial_transactions;';
  execute $p$
    create policy "role_read" on public.financial_transactions
    for select to authenticated
    using (public.current_role() = any (array['OWNER','ACCOUNTANT','MANAGER']));
  $p$;
  execute $p$
    create policy "role_insert" on public.financial_transactions
    for insert to authenticated
    with check (public.current_role() = any (array['OWNER','MANAGER']));
  $p$;
  execute $p$
    create policy "role_update" on public.financial_transactions
    for update to authenticated
    using (public.current_role() = 'OWNER')
    with check (public.current_role() = 'OWNER');
  $p$;
  execute $p$
    create policy "role_delete" on public.financial_transactions
    for delete to authenticated
    using (public.current_role() = 'OWNER');
  $p$;

  execute 'drop policy if exists "role_read" on public.cash_transactions;';
  execute 'drop policy if exists "role_insert" on public.cash_transactions;';
  execute 'drop policy if exists "role_update" on public.cash_transactions;';
  execute 'drop policy if exists "role_delete" on public.cash_transactions;';
  execute $p$
    create policy "role_read" on public.cash_transactions
    for select to authenticated
    using (public.current_role() = any (array['OWNER','ACCOUNTANT','MANAGER']));
  $p$;
  execute $p$
    create policy "role_insert" on public.cash_transactions
    for insert to authenticated
    with check (public.current_role() = any (array['OWNER','MANAGER']));
  $p$;
  execute $p$
    create policy "role_update" on public.cash_transactions
    for update to authenticated
    using (public.current_role() = 'OWNER')
    with check (public.current_role() = 'OWNER');
  $p$;
  execute $p$
    create policy "role_delete" on public.cash_transactions
    for delete to authenticated
    using (public.current_role() = 'OWNER');
  $p$;

  -- B1c) v1.1: purchase_requests boleh dibuat Manager (permintaan pembelian)
  execute 'drop policy if exists "role_insert" on public.purchase_requests;';
  execute $p$
    create policy "role_insert" on public.purchase_requests
    for insert to authenticated
    with check (public.current_role() = any (array['OWNER','MANAGER','ACCOUNTANT']));
  $p$;

  -- B2) invoices: + MITRA boleh read
  execute 'drop policy if exists "role_manage" on public.invoices;';
  execute 'drop policy if exists "role_read" on public.invoices;';
  execute 'drop policy if exists "role_insert" on public.invoices;';
  execute 'drop policy if exists "role_update" on public.invoices;';
  execute 'drop policy if exists "role_delete" on public.invoices;';
  execute $p$
    create policy "role_read" on public.invoices
    for select to authenticated
    using (public.current_role() = any (array['OWNER','ACCOUNTANT','MITRA']));
  $p$;
  execute $p$
    create policy "role_insert" on public.invoices
    for insert to authenticated
    with check (public.current_role() = any (array['OWNER','ACCOUNTANT']));
  $p$;
  execute $p$
    create policy "role_update" on public.invoices
    for update to authenticated
    using (public.current_role() = any (array['OWNER','ACCOUNTANT']))
    with check (public.current_role() = any (array['OWNER','ACCOUNTANT']));
  $p$;
  execute $p$
    create policy "role_delete" on public.invoices
    for delete to authenticated
    using (public.current_role() = any (array['OWNER','ACCOUNTANT']));
  $p$;

  -- C) audit_logs: semua authenticated boleh read & insert (app menulis audit
  --    dari aksi siapapun); update/delete hanya OWNER.
  execute 'drop policy if exists "role_manage" on public.audit_logs;';
  execute 'drop policy if exists "role_read" on public.audit_logs;';
  execute 'drop policy if exists "role_insert" on public.audit_logs;';
  execute 'drop policy if exists "role_update" on public.audit_logs;';
  execute 'drop policy if exists "role_delete" on public.audit_logs;';
  execute $p$
    create policy "role_read" on public.audit_logs
    for select to authenticated using (true);
  $p$;
  execute $p$
    create policy "role_insert" on public.audit_logs
    for insert to authenticated with check (true);
  $p$;
  execute $p$
    create policy "role_update" on public.audit_logs
    for update to authenticated
    using (public.current_role() = 'OWNER')
    with check (public.current_role() = 'OWNER');
  $p$;
  execute $p$
    create policy "role_delete" on public.audit_logs
    for delete to authenticated
    using (public.current_role() = 'OWNER');
  $p$;

  -- C2) master_data: semua authenticated read; tulis hanya OWNER
  execute 'drop policy if exists "role_manage" on public.master_data;';
  execute 'drop policy if exists "role_read" on public.master_data;';
  execute 'drop policy if exists "role_insert" on public.master_data;';
  execute 'drop policy if exists "role_update" on public.master_data;';
  execute 'drop policy if exists "role_delete" on public.master_data;';
  execute $p$
    create policy "role_read" on public.master_data
    for select to authenticated using (true);
  $p$;
  execute $p$
    create policy "role_insert" on public.master_data
    for insert to authenticated
    with check (public.current_role() = 'OWNER');
  $p$;
  execute $p$
    create policy "role_update" on public.master_data
    for update to authenticated
    using (public.current_role() = 'OWNER')
    with check (public.current_role() = 'OWNER');
  $p$;
  execute $p$
    create policy "role_delete" on public.master_data
    for delete to authenticated
    using (public.current_role() = 'OWNER');
  $p$;

  -- D) profiles: OWNER kelola semua; user lain hanya lihat diri sendiri
  execute 'drop policy if exists "profiles_select_own" on public.profiles;';
  execute 'drop policy if exists "profiles_select_all" on public.profiles;';
  execute 'drop policy if exists "profiles_manage" on public.profiles;';
  execute $p$
    create policy "profiles_select_own" on public.profiles
    for select to authenticated
    using (auth.uid() = id or public.current_role() = 'OWNER');
  $p$;
  execute $p$
    create policy "profiles_manage" on public.profiles
    for all to authenticated
    using (public.current_role() = 'OWNER')
    with check (public.current_role() = 'OWNER');
  $p$;
end $$;

-- ---------------------------------------------------------------------------
-- 11) Sinkronisasi profiles <- auth.users (insert/update saat user berubah)
-- ---------------------------------------------------------------------------
create or replace function public.sync_profile_from_auth()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email,'@',1)),
    coalesce(new.raw_app_meta_data->>'role', new.raw_user_meta_data->>'role', 'MITRA')
  )
  on conflict (id) do update
    set email = excluded.email,
        role = excluded.role,
        updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert or update on auth.users
  for each row execute function public.sync_profile_from_auth();

-- Backfill profiles dari user Supabase yang sudah ada
insert into public.profiles (id, email, display_name, role)
select u.id, u.email,
       coalesce(u.raw_user_meta_data->>'display_name', split_part(u.email,'@',1)),
       coalesce(u.raw_app_meta_data->>'role', u.raw_user_meta_data->>'role', 'MITRA')
from auth.users u
on conflict (id) do update
  set email = excluded.email, role = excluded.role, updated_at = now();


-- ---------------------------------------------------------------------------
-- 13) Supabase Realtime: publikasikan semua tabel utk realtime sync
-- Idempotent: drop & recreate publication, lalu tambah semua tabel.
-- ---------------------------------------------------------------------------
drop publication if exists supabase_realtime;
create publication supabase_realtime;
alter publication supabase_realtime add table public.profiles;
alter publication supabase_realtime add table public.locations;
alter publication supabase_realtime add table public.pens;
alter publication supabase_realtime add table public.livestock;
alter publication supabase_realtime add table public.weight_records;
alter publication supabase_realtime add table public.health_records;
alter publication supabase_realtime add table public.breeding_records;
alter publication supabase_realtime add table public.birth_records;
alter publication supabase_realtime add table public.death_records;
alter publication supabase_realtime add table public.transfer_records;
alter publication supabase_realtime add table public.sales_records;
alter publication supabase_realtime add table public.feed_inventory;
alter publication supabase_realtime add table public.financial_transactions;
alter publication supabase_realtime add table public.daily_reports;
alter publication supabase_realtime add table public.notifications;
alter publication supabase_realtime add table public.audit_logs;
alter publication supabase_realtime add table public.crop_records;
alter publication supabase_realtime add table public.crop_activities;
alter publication supabase_realtime add table public.garden_documents;
alter publication supabase_realtime add table public.ponds;
alter publication supabase_realtime add table public.water_quality_records;
alter publication supabase_realtime add table public.fish_feed_logs;
alter publication supabase_realtime add table public.fish_harvest_records;
alter publication supabase_realtime add table public.wildlife_records;
alter publication supabase_realtime add table public.wildlife_feed_schedules;
alter publication supabase_realtime add table public.inventory_items;
alter publication supabase_realtime add table public.stock_mutations;
alter publication supabase_realtime add table public.purchase_requests;
alter publication supabase_realtime add table public.purchase_orders;
alter publication supabase_realtime add table public.tasks;
alter publication supabase_realtime add table public.attendance_records;
alter publication supabase_realtime add table public.kpi_scores;
alter publication supabase_realtime add table public.cash_transactions;
alter publication supabase_realtime add table public.lpj_reports;
alter publication supabase_realtime add table public.approval_requests;
alter publication supabase_realtime add table public.invoices;
alter publication supabase_realtime add table public.master_data;

-- ---------------------------------------------------------------------------
-- 14) Seed lokasi produksi (opsional, idempotent)
-- ---------------------------------------------------------------------------
insert into public.locations (id, name, address, pic_name, pic_phone, livestock_types, pen_count, status, notes)
values
  ('loc-kulim','Kulim','Jl. Lintas Kulim No. 45, Riau','Budi Santoso','081234567890', array['Sapi','Kerbau'], 6, 'Aktif','Kandang utama penggemukan sapi BX & Simmental'),
  ('loc-sontang','Sontang','Desa Sontang, Kab. Rokan Hulu','Rahmat Hidayat','081398765432', array['Sapi'], 4, 'Aktif','Kandang breeding & pembibitan sapi lokal'),
  ('loc-ras','RAS','Kawasan Agrowisata RAS, Siak','Hendra Wijaya','081122334455', array['Sapi','Kerbau'], 5, 'Aktif','Kandang penggemukan khusus ternak qurban & potong')
on conflict (id) do nothing;
