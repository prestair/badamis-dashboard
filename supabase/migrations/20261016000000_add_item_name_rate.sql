-- Add a per-foot RATE to each Item Name (used to auto-calculate the Table
-- "Calculated Rate" in quotations). NULLABLE / blank by default — the user
-- fills in rates per item. Only the "table" item is pre-set to 4000.
--
-- Safe to run once in the Supabase SQL editor (idempotent).

-- Nullable column, NO default — existing rows stay blank (NULL).
alter table public.quotation_item_names
  add column if not exists rate numeric;

-- If an earlier attempt made the column NOT NULL / defaulted, relax it so blank
-- rates are allowed.
alter table public.quotation_item_names alter column rate drop not null;
alter table public.quotation_item_names alter column rate drop default;

-- Pre-set only the exact "table" item (case-insensitive) to 4000; leave the
-- rest blank for the user to fill in.
update public.quotation_item_names
  set rate = 4000
  where lower(trim(item_name)) = 'table'
    and rate is null;
