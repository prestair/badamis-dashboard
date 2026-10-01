-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: Login Activity Tracking + Per-User Edit Permissions + Quotation Status
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Add permission columns to app_users
alter table public.app_users
  add column if not exists can_edit_completed    boolean not null default false,
  add column if not exists can_edit_daily_report boolean not null default false;

-- admin always has both permissions implicitly, but the columns still exist for
-- forward-compatibility if admin role logic ever changes.
update public.app_users set can_edit_completed = true, can_edit_daily_report = true
  where role = 'admin';

-- 2. Add status column to quotations table (if it exists)
-- Note: quotations table may be created by app usage rather than explicit migration
do $$
begin
  if exists (select 1 from information_schema.tables where table_name = 'quotations' and table_schema = 'public') then
    alter table public.quotations
      add column if not exists status text not null default 'active'
        check (status in ('active', 'completed'));
  end if;
end $$;

-- 3. Create login_activity table
create table if not exists public.login_activity (
  id           uuid        primary key default gen_random_uuid(),
  user_id      uuid        references public.app_users(id) on delete set null,
  username     text        not null,
  logged_in_at timestamptz not null default now(),
  ip_address   text,
  device_info  text,
  latitude     double precision,
  longitude    double precision,
  gps_accuracy double precision,
  gps_error    text
);

-- Index for fast per-user lookups and admin list view
create index if not exists login_activity_username_idx
  on public.login_activity (username, logged_in_at desc);

-- RLS: anon/authenticated cannot read or write — all access goes through service_role API
alter table public.login_activity enable row level security;

revoke select, insert, update, delete on public.login_activity from anon, authenticated;
grant all on public.login_activity to service_role;
