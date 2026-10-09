-- Add a "Standard Rate" to each Item Name — used for the quotation Calculated
-- Rate when the item has no dimensions (SIZE = "STD"). Nullable / blank by
-- default; the admin fills it per item.
--
-- Safe to run once in the Supabase SQL editor (idempotent).

alter table public.quotation_item_names
  add column if not exists standard_rate numeric;
