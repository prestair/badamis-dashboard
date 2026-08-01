create table if not exists public.quotation_item_names (
  id uuid primary key default gen_random_uuid(),
  item_name text not null check (char_length(trim(item_name)) between 1 and 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists quotation_item_names_item_name_lower_idx
  on public.quotation_item_names (lower(trim(item_name)));

alter table public.quotation_item_names enable row level security;

drop policy if exists "quotation item names are readable" on public.quotation_item_names;
create policy "quotation item names are readable"
  on public.quotation_item_names for select
  to anon, authenticated
  using (true);

-- Standard application users may read dropdown options but cannot add, edit,
-- or delete rows directly. Admin mutations are performed by the server API
-- through SUPABASE_SERVICE_ROLE_KEY after the application admin check.
revoke insert, update, delete, truncate, references, trigger
  on public.quotation_item_names from anon, authenticated;
grant select on public.quotation_item_names to anon, authenticated;
grant all on public.quotation_item_names to service_role;

-- Seed Item Name options from descriptions already saved in quotations.
insert into public.quotation_item_names (item_name)
select distinct trim(item ->> 'desc')
from public.quotations as quotation
cross join lateral jsonb_array_elements(coalesce(quotation.rows::jsonb, '[]'::jsonb)) as item
where coalesce(item ->> '__quotationAudit', 'false') <> 'true'
  and nullif(trim(item ->> 'desc'), '') is not null
on conflict do nothing;
