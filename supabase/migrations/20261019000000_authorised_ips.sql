-- Authorised IPs table — only IPs in this table can login (when table is non-empty).
-- If table is empty, no restriction applies (all IPs allowed).

create table if not exists public.authorised_ips (
  id         uuid        primary key default gen_random_uuid(),
  ip_address text        not null,
  label      text,
  created_at timestamptz not null default now()
);

create unique index if not exists authorised_ips_ip_idx
  on public.authorised_ips (ip_address);

alter table public.authorised_ips enable row level security;

revoke select, insert, update, delete on public.authorised_ips from anon, authenticated;
grant all on public.authorised_ips to service_role;
