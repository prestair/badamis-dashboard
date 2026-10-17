-- Add a flexible per-item "rate rule" (JSON) to each Item Name. This lets an
-- admin define how the quotation Calculated Rate is derived for that item:
--   { type: "standard" }                                   → STD→standardRate, dims→feet*ratePerFoot (0.25 rounding)
--   { type: "perfoot" }                                    → feet(L)*ratePerFoot (0.25 rounding)
--   { type: "conditionalL", thresholdInch, rateLow, rateHigh }
--        → L(in inch) <= thresholdInch ? rateLow : rateHigh, then feet(L)*rate
--   { type: "volume", multiplier }                         → feet(L) * feet(B) * multiplier
-- All numbers are editable by the admin, so future changes need no code change.
--
-- Safe to run once in the Supabase SQL editor (idempotent).

alter table public.quotation_item_names
  add column if not exists rate_rule jsonb;
