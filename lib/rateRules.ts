// ─────────────────────────────────────────────────────────────────────────────
// Rate Rules — per-item logic for the quotation "Calculated Rate".
//
// Each Item Name can carry a `rate_rule` describing HOW its Calculated Rate is
// derived from the entered dimensions. All numeric parameters are admin-editable
// (stored in the DB), so future changes never require a code change.
//
// Rule types:
//   standard      → SIZE "STD" (no unit+L) uses the item's Standard Rate;
//                   otherwise feet(L) * ratePerFoot  (0.25-cutoff rounding).
//   perfoot       → always feet(L) * ratePerFoot     (0.25-cutoff rounding).
//   conditionalL  → pick ratePerFoot by L: L(inch) <= thresholdInch ? rateLow : rateHigh,
//                   then feet(L) * chosenRate         (0.25-cutoff rounding).
//   volume        → feetRound(L) * feetRound(B) * multiplier.
//
// feet conversion: MM → /304.8, INCH → /12.
// "0.25-cutoff rounding": fractional part <= 0.25 floors, else ceils (whole feet).
// ─────────────────────────────────────────────────────────────────────────────

export type RateRule =
  | { type: "standard" }
  | { type: "perfoot" }
  | { type: "table" }  // like perfoot but with 0.25-cutoff whole-feet rounding
  | { type: "conditionalL"; thresholdInch: number; rateLow: number; rateHigh: number }
  | { type: "volume"; multiplier: number };

export const DEFAULT_RATE_RULE: RateRule = { type: "standard" };

// Parse an unknown value (DB JSON / form) into a safe RateRule. Falls back to
// "standard" when shape/values are invalid.
export function parseRateRule(value: unknown): RateRule {
  if (!value || typeof value !== "object") return DEFAULT_RATE_RULE;
  const v = value as Record<string, unknown>;
  const type = String(v.type ?? "");
  if (type === "perfoot") return { type: "perfoot" };
  if (type === "table") return { type: "table" };
  if (type === "conditionalL") {
    return {
      type: "conditionalL",
      thresholdInch: num(v.thresholdInch),
      rateLow: num(v.rateLow),
      rateHigh: num(v.rateHigh),
    };
  }
  if (type === "volume") {
    return { type: "volume", multiplier: num(v.multiplier) };
  }
  return { type: "standard" };
}

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function clean(v?: string): string {
  const s = (v ?? "").trim();
  return s === "null" || s === "undefined" ? "" : s;
}

// Whole-feet rounding with a 0.25 cutoff.
function roundFeet(feet: number): number {
  const frac = feet - Math.floor(feet);
  return frac <= 0.25 ? Math.floor(feet) : Math.ceil(feet);
}

function toFeet(value: number, unit: "MM" | "INCH"): number {
  return unit === "MM" ? value / 304.8 : value / 12;
}

function toInch(value: number, unit: "MM" | "INCH"): number {
  return unit === "MM" ? value / 25.4 : value;
}

// Compute the Calculated Rate string for a row, given its rule + snapshot rates.
//  unit:        "MM" | "INCH" | "" (blank = no unit chosen)
//  dimL, dimB:  raw dimension strings
//  ratePerFoot: the item's "Rate Per Foot" snapshot (string)
//  stdRate:     the item's "Standard Rate" snapshot (string)
//  rule:        the item's rate rule
// Returns "" (blank) when it cannot/should not compute (Option X).
export function computeCalcRateByRule(
  unit: "MM" | "INCH" | "" | undefined,
  dimL: string | undefined,
  dimB: string | undefined,
  ratePerFoot: string | undefined,
  stdRate: string | undefined,
  rule: RateRule,
): string {
  const u: "MM" | "INCH" = unit === "INCH" ? "INCH" : "MM";
  const hasUnit = unit === "MM" || unit === "INCH";
  const l = Number(clean(dimL));
  const hasL = Number.isFinite(l) && l > 0;
  const b = Number(clean(dimB));
  const hasB = Number.isFinite(b) && b > 0;

  // Round money to a tidy integer (avoids 22499.99 style float noise). Exact
  // feet are used everywhere EXCEPT the "table" rule, which rounds the feet to a
  // whole number with a 0.25 cutoff before multiplying.
  const money = (n: number) => String(Math.round(n));

  switch (rule.type) {
    case "volume": {
      // Needs L and B. feet(L) * feet(B) * multiplier (EXACT feet).
      if (!hasL || !hasB || !rule.multiplier) return "";
      const val = toFeet(l, u) * toFeet(b, u) * rule.multiplier;
      return val > 0 ? money(val) : "";
    }
    case "conditionalL": {
      // EXACT feet. 30 inch → 2.5 ft → 2.5 * rate.
      if (!hasL) return "";
      const lInch = toInch(l, u);
      const perFoot = lInch <= rule.thresholdInch ? rule.rateLow : rule.rateHigh;
      if (!perFoot || perFoot <= 0) return "";
      return money(toFeet(l, u) * perFoot);
    }
    case "perfoot": {
      // EXACT feet.
      if (!hasL) return "";
      const pf = Number((ratePerFoot ?? "").trim());
      if (!Number.isFinite(pf) || pf <= 0) return "";
      return money(toFeet(l, u) * pf);
    }
    case "table": {
      // 0.25-cutoff WHOLE-feet rounding (the original "Table" behaviour).
      if (!hasL) return "";
      const pf = Number((ratePerFoot ?? "").trim());
      if (!Number.isFinite(pf) || pf <= 0) return "";
      return money(roundFeet(toFeet(l, u)) * pf);
    }
    case "standard":
    default: {
      // STD (no unit + no L) → standard rate; otherwise EXACT feet * ratePerFoot.
      if (!hasUnit && !hasL) {
        const s = Number((stdRate ?? "").trim());
        return Number.isFinite(s) && s > 0 ? String(s) : "";
      }
      if (!hasL) return "";
      const pf = Number((ratePerFoot ?? "").trim());
      if (!Number.isFinite(pf) || pf <= 0) return "";
      return money(toFeet(l, u) * pf);
    }
  }
}
