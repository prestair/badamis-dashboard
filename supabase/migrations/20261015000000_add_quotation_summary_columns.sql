-- Reduce Supabase egress: let the quotation LIST show the edit-count badge and
-- user name WITHOUT shipping the heavy `rows` JSONB (which also carries the
-- audit/edit history). We add two tiny flat columns the list can select cheaply.
--
-- Safe to run once in the Supabase SQL editor (idempotent via IF NOT EXISTS).
-- The heavy edit history still lives inside `rows`; it is read on demand when a
-- single quotation is opened (View / Edit / Copy / Print / Edit-History popup).

alter table public.quotations
  add column if not exists created_by text;

alter table public.quotations
  add column if not exists edit_count integer not null default 0;

-- Optional backfill of OLD quotations so their list badge shows correct values.
-- editCount/createdBy are packed inside the `rows` JSON by lib/quotationAudit.ts
-- in an element shaped like: { "__quotationAudit": true, "createdBy": "...",
-- "editCount": N, "editHistory": [...] }.
--
-- The two statements below find that audit element inside the rows array and
-- copy its scalar fields up to the flat columns. They only touch rows that
-- still have the defaults, so re-running is safe. If your Postgres version or
-- data shape makes these error, SKIP them — old rows will simply show
-- "Unknown (0)" in the list badge until next save, and the FULL history still
-- appears when the quotation is opened (the detail fetch recovers it from JSON).

update public.quotations q
set created_by = sub.created_by
from (
  select id, (elem ->> 'createdBy') as created_by
  from public.quotations,
       lateral jsonb_array_elements(rows) as elem
  where jsonb_typeof(rows) = 'array'
    and elem ? '__quotationAudit'
) sub
where q.id = sub.id
  and q.created_by is null
  and sub.created_by is not null
  and sub.created_by <> '';

update public.quotations q
set edit_count = greatest(coalesce((sub.edit_count)::int, 0), coalesce(sub.history_len, 0))
from (
  select id,
         (elem ->> 'editCount') as edit_count,
         jsonb_array_length(coalesce(elem -> 'editHistory', '[]'::jsonb)) as history_len
  from public.quotations,
       lateral jsonb_array_elements(rows) as elem
  where jsonb_typeof(rows) = 'array'
    and elem ? '__quotationAudit'
) sub
where q.id = sub.id
  and q.edit_count = 0;
