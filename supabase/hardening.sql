-- ============================================================================
-- HARDENING ternak-monitor (2026-09-24)
-- Terapkan via: Supabase Dashboard > SQL Editor (atau psql sebagai postgres)
-- Idempotent: aman dijalankan berulang.
-- Isi:
--   1) current_role: hanya app_metadata (user tidak bisa self-ubah)
--   2) Revoke hak anon/public (defense-in-depth)
--   3) Audit trigger DB-level utk SEMUA tabel operasional (append-only log)
--   4) audit_logs (app-level) jadi append-only
--   5) profiles: non-OWNER tidak bisa mengubah role/status sendiri (trigger)
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) current_role: HANYA app_metadata. Fallback user_metadata dihapus karena
--    user_metadata bisa diubah user sendiri via auth.updateUser (eskalasi).
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
    'MITRA'
  );
$$;

-- ---------------------------------------------------------------------------
-- 2) Revoke hak default dari anon/public (RLS tetap pengaman utama;
--    ini mempersempit permukaan: anon tidak bisa enumerate/direct-access)
-- ---------------------------------------------------------------------------
revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;
revoke all on all functions in schema public from public;
grant execute on all functions in schema public to authenticated;
alter default privileges in schema public revoke all on tables from anon;
alter default privileges in schema public revoke all on sequences from anon;
alter default privileges in schema public revoke all on functions from public;
alter default privileges in schema public grant execute on functions to authenticated;

-- ---------------------------------------------------------------------------
-- 3) Audit DB-level: setiap INSERT/UPDATE/DELETE pada tabel operasional
--    tercatat otomatis (trigger), termasuk aksi via API langsung.
--    Hanya OWNER bisa membaca; tidak ada jalur tulis bagi client.
-- ---------------------------------------------------------------------------
create table if not exists public.audit_db_logs (
  id bigserial primary key,
  table_name text not null,
  row_id text,
  action text not null,
  changed_by uuid,
  changed_by_email text,
  changed_by_role text,
  row_data jsonb,
  changed_fields jsonb,
  occurred_at timestamptz not null default now()
);

alter table public.audit_db_logs enable row level security;

drop policy if exists "auditdb_read_owner" on public.audit_db_logs;
create policy "auditdb_read_owner" on public.audit_db_logs
  for select to authenticated
  using (public.current_role() = 'OWNER');
-- Tanpa policy insert/update/delete => hanya service_role yang bisa menulis.

create or replace function public.audit_row()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  rid text;
  v_email text;
  v_role text;
  v_uid uuid := auth.uid();
  v_changed jsonb;
begin
  if tg_op = 'DELETE' then
    rid := coalesce(old.id::text, '');
  else
    rid := coalesce(new.id::text, '');
    if tg_op = 'UPDATE' then
      select jsonb_object_agg(key, value) into v_changed
      from jsonb_each(to_jsonb(new))
      where to_jsonb(old) ->> key is distinct from value;
    end if;
  end if;
  select email into v_email from auth.users where id = v_uid;
  v_role := public.current_role();
  insert into public.audit_db_logs
    (table_name, row_id, action, changed_by, changed_by_email, changed_by_role, row_data, changed_fields)
  values
    (tg_table_name, rid, tg_op, v_uid, v_email, v_role,
     case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end,
     v_changed);
  return coalesce(new, old);
end;
$$;

do $$
declare t text;
begin
  foreach t in array array[
    'locations','pens','livestock','weight_records','health_records',
    'breeding_records','birth_records','death_records','transfer_records',
    'sales_records','feed_inventory','financial_transactions','daily_reports',
    'notifications','crop_records','crop_activities','garden_documents','ponds',
    'water_quality_records','fish_feed_logs','fish_harvest_records',
    'wildlife_records','wildlife_feed_schedules','inventory_items',
    'stock_mutations','purchase_requests','purchase_orders','tasks',
    'attendance_records','kpi_scores','cash_transactions','lpj_reports',
    'approval_requests','invoices','master_data'
  ]
  loop
    execute format('drop trigger if exists audit_row_trg on public.%I;', t);
    execute format(
      'create trigger audit_row_trg after insert or update or delete on public.%I
       for each row execute function public.audit_row();', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 4) audit_logs (log level app): append-only. Update/delete dinonaktifkan
--    agar riwayat tidak bisa diubah/dihapus siapapun lewat client.
-- ---------------------------------------------------------------------------
drop policy if exists "role_update" on public.audit_logs;
drop policy if exists "role_delete" on public.audit_logs;

-- ---------------------------------------------------------------------------
-- 5) profiles: trigger pelindung - hanya OWNER boleh mengubah role/status.
--    (Non-OWNER tetap boleh edit nama/telepon/avatar miliknya.)
-- ---------------------------------------------------------------------------
create or replace function public.protect_profile_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.current_role() <> 'OWNER' then
    if new.role is distinct from old.role or new.status is distinct from old.status then
      raise exception 'Hanya OWNER boleh mengubah role/status akun';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_profile_role_trg on public.profiles;
create trigger protect_profile_role_trg
  before update on public.profiles
  for each row execute function public.protect_profile_role();
