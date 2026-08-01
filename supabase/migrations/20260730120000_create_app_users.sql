-- App users table for dashboard authentication
-- Passwords are stored as plain text (matching the existing client-side model).
-- For production hardening, consider bcrypt hashing in the API layer.

create table if not exists public.app_users (
  id uuid primary key default gen_random_uuid(),
  username text not null,
  password text not null,
  role text not null default 'user' check (role in ('admin', 'user')),
  full_name text not null default '',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Case-insensitive unique username
create unique index if not exists app_users_username_lower_idx
  on public.app_users (lower(trim(username)));

-- RLS: allow authenticated and anon to read (login needs to verify credentials)
alter table public.app_users enable row level security;

drop policy if exists "app_users are readable" on public.app_users;
create policy "app_users are readable"
  on public.app_users for select
  to anon, authenticated
  using (true);

-- Only service_role can insert/update/delete (mutations go through the API)
revoke insert, update, delete on public.app_users from anon, authenticated;
grant all on public.app_users to service_role;

-- Seed the default admin account
insert into public.app_users (username, password, role, full_name, active)
values ('admin', 'prestair@123', 'admin', 'Administrator', true)
on conflict do nothing;
