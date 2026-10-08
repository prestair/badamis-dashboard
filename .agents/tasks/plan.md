# Implementation Plan — 5 new dimension columns (MM/INCH, L, B, H, B/S) + auto SIZE + Table auto-RATE

Scope: on-screen quotation entry table only (Part A + Part B inside `components/QuotationModal.tsx`).
New columns must NEVER reach the PDF/Excel export, and OLD saved quotations must render exactly as before.

Project facts (verified during exploration):
- Build/typecheck: `npx tsc --noEmit` (baseline is currently GREEN — exit 0).
- Dev server: `npm run dev` (Next.js 15.3.3, React 19). No test framework is configured in `package.json`; verification is `tsc --noEmit` + manual browser checks.
- Rows are stored in Supabase JSONB `rows` column. Pack/unpack (`lib/quotationAudit.ts`) does NOT remap item fields — extra fields on item objects pass through storage untouched. The ONLY place that strips unknown fields on reload is `normalizeSavedRows` in `context/QuotationContext.tsx`, so new persisted fields MUST be added there or they vanish on reopen.
- PDF/Excel (`components/QuotationDownload.tsx` + `lib/excelDownload.ts`) and `QuotationViewModal.tsx` each define their own `RowData` reading only existing fields (`size`, `rate`, …). They never read the new fields, so the 5 columns are automatically absent from export — PROVIDED the download `rows` mapping is not extended.

Backward-compatibility contract (applies to every step):
- All new fields are OPTIONAL on both `ItemRow` and `SavedRowState`.
- Opening an OLD quotation (or OLD localStorage draft) must NOT trigger any recompute: `size` and `rate` are restored verbatim from storage; dims default to blank and `mmInch` defaults to `"MM"`. Recompute happens ONLY on a user edit to `mmInch`/`dimL`/`dimB`/`dimH`/`dimBS`.

---

- [x] 1. Add shared pure helpers + extend the in-modal `ItemRow` type and its factories.
      In `components/QuotationModal.tsx`:
      (a) Extend `type ItemRow` with optional fields: `mmInch?: "MM" | "INCH"; dimL?: string; dimB?: string; dimH?: string; dimBS?: string; rateManual?: boolean;`.
      (b) In `blankRow(slNo)` initialise `mmInch: "MM", dimL: "", dimB: "", dimH: "", dimBS: "", rateManual: false`. Leave `blankSection` unchanged (sections have no dims).
      (c) Add three module-level pure helpers (above `export default function QuotationModal`), each with a doc comment covering edge cases:
        - `function composeSize(unit, dimL, dimB, dimH, dimBS): string` — SIZE spec below.
        - `function computeTableRate(unit, desc, dimL): string | null` — RATE spec below; returns null when it should not auto-write (not a Table item, or `dimL` not a positive finite number).
        - `function recomputeDerived(row: ItemRow): ItemRow` — if `row.rowType !== "item"` return row unchanged; else compute `size = composeSize(...)`; then `const auto = computeTableRate(row.mmInch ?? "MM", row.desc, row.dimL)`; if `auto !== null && !row.rateManual` set `rate = auto`; return the new row. (Document: manual-override flag `rateManual` is set true when the user types in RATE and reset to false whenever a dimension/unit changes, so auto-calc resumes after the next dimension edit — requirement 6.)
      Files: `components/QuotationModal.tsx`
      Verify: `npx tsc --noEmit` — exit 0 (helpers compile; unused is fine at this step).

      SIZE spec (`composeSize`): collect L,B,H from `dimL,dimB,dimH` keeping only non-empty trimmed values, IN ORDER; if `unit === "INCH"` append `"` to each collected value; join the collected L/B/H with uppercase `"X"`; if `dimBS` non-empty trimmed, append `"+" + bs` (for INCH append `bs + "\""`). Pass numeric-looking strings through verbatim (no Number() reformat — preserves decimals). Examples: MM 1280/150/812/200 -> `1280X150X812+200`; MM 1280/150//200 -> `1280X150+200`; MM 1280/150/200/ -> `1280X150X200`; INCH 53/28/34/4 -> `53"X28"X34"+4"`. If all four empty -> `""`.

      RATE spec (`computeTableRate`): return null unless `desc` contains `"table"` (case-insensitive substring) AND `Number(dimL)` is finite and > 0. Else `const feet = unit === "MM" ? Number(dimL)/304.8 : Number(dimL)/12; const roundedHalf = Math.round(feet*2)/2; return String(roundedHalf * 4000);`. (1 ft = 304.8 mm, 12 inch.)

- [x] 2. Default the new fields in BOTH restore paths (Part A `initItemRows` and the inline Part B init mapper) WITHOUT recomputing.
      In `components/QuotationModal.tsx`, in `initItemRows()` item branch and in the `useState(() => …)` Part B mapper item branch, add to each restored item object: `mmInch: (row.mmInch === "INCH" ? "INCH" : "MM"), dimL: row.dimL ?? "", dimB: row.dimB ?? "", dimH: row.dimH ?? "", dimBS: row.dimBS ?? "", rateManual: false`. Keep `size: row.size` and `rate: …` EXACTLY as currently restored (do NOT call `recomputeDerived` here — old rows must stay untouched). Section branches get no new fields.
      Note: `row` here is `SavedRowState`; step 7 adds these optional props to that type so these reads typecheck. Sequence 7 before compiling if needed, or cast — but cleanest is to do step 7 together with this.
      Files: `components/QuotationModal.tsx`
      Verify: `npx tsc --noEmit` — exit 0 after step 7 is also applied.

- [x] 3. Make both row mutators recompute derived values on dimension/unit edits.
      In `components/QuotationModal.tsx`, change `updateItemRow` and `updatePartBRow` so that when the mutated row is updated:
        - Apply `{ ...r, [field]: value }` as today.
        - If `field` is one of `"mmInch" | "dimL" | "dimB" | "dimH" | "dimBS"`: also set `rateManual: false` (dimension change re-enables auto-calc per requirement 6), then pass the row through `recomputeDerived(...)`.
        - If `field === "rate"`: set `rateManual: true` on that row (user manual override per requirement 6), do NOT recompute.
        - If `field === "desc"`: pass through `recomputeDerived(...)` too (so typing/removing "table" in the item name re-evaluates the auto-rate, respecting `rateManual`).
        - All other fields: behave exactly as today.
      Keep `setSaved(false)` as-is. The signature `field: Exclude<keyof ItemRow, "rowType">` already permits the new field names once step 1 extends `ItemRow`.
      Files: `components/QuotationModal.tsx`
      Verify: `npx tsc --noEmit` — exit 0.

- [x] 4. Add the 5 new columns to BOTH table heads and the 5 new input cells to BOTH item-row renderers.
      In `components/QuotationModal.tsx`:
      (a) Part A `<thead>` (slate-700) and Part B `<thead>` (indigo-700): insert 5 `<th>` between the ADDITIONAL DESCRIPTION `<th>` and the SIZE `<th>`, in order: `MM/INCH`, `L`, `B`, `H`, `B/S`. Give them small fixed widths (e.g. `width:72` for MM/INCH, `width:48` each for L/B/H/B/S). SIZE `<th>` stays (derived, read-only display).
      (b) Part A item `<tr>` and Part B item `<tr>`: insert 5 `<td>` in the SAME position (between ADDITIONAL DESCRIPTION cell and SIZE cell):
        - MM/INCH: a `<select>` bound to `row.mmInch ?? "MM"`, options `MM` and `INCH`, `onChange` -> `updateItemRow(row.uid,"mmInch",e.target.value)` (Part B: `updatePartBRow`).
        - L/B/H/B/S: four text (or `inputMode="decimal"`) inputs bound to `row.dimL`/`dimB`/`dimH`/`dimBS` (`?? ""`), each `onChange` -> `updateItemRow(row.uid, "dimL"|"dimB"|"dimH"|"dimBS", e.target.value)` (Part B uses `updatePartBRow`). Match existing input className styling.
        - SIZE cell: change from an editable input to a READ-ONLY display of `row.size` (derived). Rationale: SIZE is now composed from L/B/H/B/S; keeping it editable would let a manual edit be silently overwritten on the next dimension change. Render as read-only text (or a disabled/readOnly input) showing `row.size`. (If reviewer prefers SIZE remain editable, that is a user-visible behaviour change — see requirement 3 which says SIZE auto-populates; read-only is the faithful reading.)
        - RATE input: unchanged markup (stays a normal editable number input bound to `row.rate`); the `rateManual` flag is handled in the mutator (step 3).
      Keep ITEM CODE, ITEM NAME, HSN, QTY, RATE, AMOUNT, move, delete cells exactly as-is.
      Files: `components/QuotationModal.tsx`
      Verify: `npx tsc --noEmit` — exit 0; then step 5 fixes colSpans before browser check.

- [x] 5. Fix every colSpan in BOTH tables for the new column count.
      Adding 5 columns raises the data-column count. Current layout has 9 "content" columns before the move/delete columns; section rows use `colSpan={9}` (spanning everything except the move+delete cells) and the "+ Add Row" cell uses `colSpan={11}` (full width incl. move+delete). After adding 5 columns: section `colSpan` 9 -> 14, and "+ Add Row" `colSpan` 11 -> 16.
      In `components/QuotationModal.tsx` update: Part A section row `colSpan={9}` -> `14` (around line 1084), Part A add-row `colSpan={11}` -> `16` (around line 1213), Part B section row `colSpan={9}` -> `14` (around line 1278), Part B add-row `colSpan={11}` -> `16` (around line 1361). Verify the exact header column count after step 4 and set section span = (total header cells − 2 for the move+delete th) and add-row span = total header cells; adjust the +5 arithmetic if the actual pre-change counts differ.
      Files: `components/QuotationModal.tsx`
      Verify: `npm run dev`, open a new quotation, go to Step 2 — section header bars and the "+ Add Row" cell span the full table width with no column misalignment in Part A and (enable Part B) Part B.

- [x] 6. Add the new fields to both `handleSave` maps (Part A `savedRows`, Part B `savedPartBRows`).
      In `components/QuotationModal.tsx` `handleSave()`, in the item branch of BOTH `itemRows.map` and `partBItemRows.map`, add to the returned `SavedRowState` object: `mmInch: r.mmInch ?? "MM", dimL: r.dimL ?? "", dimB: r.dimB ?? "", dimH: r.dimH ?? "", dimBS: r.dimBS ?? ""`. Do NOT persist `rateManual` (UI-only flag). Section branches unchanged. `size` and `rate` keep their current mapping (so the composed size + computed rate are saved).
      Files: `components/QuotationModal.tsx`
      Verify: `npx tsc --noEmit` — exit 0 (depends on step 7 extending `SavedRowState`).

- [x] 7. Extend `SavedRowState` and preserve the new fields through reload normalisation.
      In `context/QuotationContext.tsx`:
      (a) Add optional fields to `type SavedRowState`: `mmInch?: "MM" | "INCH"; dimL?: string; dimB?: string; dimH?: string; dimBS?: string;`.
      (b) In `normalizeSavedRows`, add to the returned object: `mmInch: row.mmInch === "INCH" ? "INCH" : (row.mmInch === "MM" ? "MM" : undefined)`, and `dimL: row.dimL !== undefined ? String(row.dimL) : undefined` (same for dimB/dimH/dimBS). Using `undefined` for absent fields keeps OLD rows free of the new keys so nothing changes for them. (This is the critical persistence fix — without it the fields are stripped on every reload.)
      Files: `context/QuotationContext.tsx`
      Verify: `npx tsc --noEmit` — exit 0 across the whole project (this unblocks steps 2 and 6 type-wise).

- [x] 8. CONFIRM the PDF/Excel exclusion — make NO changes, just verify.
      Do NOT add any new field to: the two `QuotationDownload` `rows={itemRows.map(...)}` / `partBRows={...}` mappings in `components/QuotationModal.tsx` (top bar + bottom bar), the `RowData` type in `components/QuotationDownload.tsx`, the `RowData` type in `lib/excelDownload.ts`, or the download mapping in `components/QuotationViewModal.tsx`. These continue to pass only `{ rowType, slNo, itemCode, desc, size, hsn, qty, additionalColumn, rate, amt, section }`, so the 5 raw columns are structurally absent from PDF and Excel while the composed SIZE still appears. Do NOT touch PDF/Excel column layouts, widths, or `colSpan`/merge logic.
      Files: none (verification-only guard).
      Verify (manual, in step 9): generate PDF and Excel for a saved quotation containing dim values and confirm no MM/INCH/L/B/H/B/S columns appear and SIZE shows the composed string.

- [x] 9. Full verification pass (typecheck + browser).
      Run `npx tsc --noEmit` — expect exit 0 with zero errors.
      Then `npm run dev` and in the browser:
        1. NEW quotation, Step 2, Part A: add an item, set ITEM NAME containing "table" (e.g. "Work Table"), MM/INCH = MM, L=1280 B=150 H=812 B/S=200 -> SIZE shows `1280X150X812+200`; RATE auto-fills to `round(1280/304.8*2)/2*4000` = `round(8.398...*2)/2*4000` = `4.0 * 4000` = `16000`. Change L and confirm RATE recomputes.
        2. Switch MM/INCH to INCH with L=53 B=28 H=34 B/S=4 -> SIZE shows `53"X28"X34"+4"`; RATE = `round(53/12*2)/2*4000` = `round(8.83*2)/2*4000` = `4.5*4000` = `18000`.
        3. Non-Table item (e.g. "Sink"): entering L/B/H/B/S composes SIZE but RATE is NOT auto-filled.
        4. Manual RATE override: type a RATE on a Table item, then re-type the same dim value — confirm the manual value persists until a dimension actually changes, after which auto-calc resumes.
        5. Enable Part B and repeat checks 1 & 3 in the Part B table (columns present, auto-size/rate work, colSpans aligned).
        6. Save the quotation, reopen it (edit) — dims/mmInch restore, SIZE/RATE unchanged.
        7. Open an OLD existing quotation (one saved before this change) — it renders exactly as before: SIZE shows its stored value, no recompute, no crash; the 5 new input cells are blank with MM/INCH defaulted to MM.
        8. Download PDF and Excel from a saved quotation with dims — confirm NO MM/INCH/L/B/H/B/S columns and SIZE shows the composed string (requirement 8).
      Files: none.
      Verify: all 8 browser checks pass and `npx tsc --noEmit` is clean. Do NOT deploy or git push.

---

## VERIFICATION NOTE (first iteration — implemented)

What I ran (in `c:\Users\IT Admin\Downloads\Prestairsystemsllp`):
- `npx tsc --noEmit` BEFORE changes → exit 0 (baseline green).
- `npx tsc --noEmit` AFTER all changes → exit 0 (ZERO type errors).
- `npm run build` (full Next.js 15 production build; type-checks + compiles every page) →
  "Compiled successfully", "Checking validity of types ..." passed, all 13 pages generated, exit 0.
  (The dev-server background launch was blocked by the host guard, so a full `next build` was
   used instead — it compiles the same code and runs the TS type-checker, surfacing any compile
   error in QuotationModal/context. None were found.)

Static exclusion confirmed (NO mmInch/dimL/dimB/dimH/dimBS keys anywhere in export paths):
- `components/QuotationDownload.tsx` `RowData` type — unchanged, reads only size/rate/etc.
- `lib/excelDownload.ts` `RowData` type — unchanged.
- `components/QuotationViewModal.tsx` — reads only `row.size` (grep confirmed, no dim fields).
- BOTH `<QuotationDownload rows=…>` invocations in `QuotationModal.tsx` (top bar + bottom bar)
  map only { rowType, slNo, itemCode, desc, size, hsn, qty, additionalColumn, rate, amt, section }.
  partBRows mapping likewise. So the 5 raw columns are structurally absent from PDF/Excel while
  the composed SIZE (row.size) still appears.

Backward-compatibility confirmed statically:
- New fields are OPTIONAL on both `ItemRow` (QuotationModal) and `SavedRowState` (context).
- `initItemRows()` + Part B init mapper restore `size`/`rate` verbatim and only DEFAULT the new
  fields (mmInch:"MM"/saved, dims:""/saved); they do NOT call `recomputeDerived`, so opening an
  OLD quotation never recomputes its size or rate.
- `normalizeSavedRows` keeps absent fields `undefined`, so OLD rows carry no new keys.
- Storage pass-through verified: `withQuotationDiscounts` spreads full item objects; `toRow()` in
  both API routes passes `rows` through without whitelisting. JSONB column, no DB migration.
- Auto-save-draft serialises `itemRows`/`partBItemRows` directly and restores with `?? ""` guards
  via the same optional fields; an OLD draft lacking the new fields restores without crash.

Manual browser checks (checks 1–8 in step 9) NOT executed by the agent (dev server launch blocked
by host). Reviewer/user should run `npm run dev` (localhost:3000) and walk through step 9's checks.
Expected auto-RATE: MM L=1280 → 16000; INCH L=53 → 18000 (hand-verified against the formula).

Notes / assumptions:
- SIZE is made read-only on screen because it is now a derived field (requirement 3 says L/B/H/B/S auto-populate SIZE). If a reviewer or the user wants SIZE to stay hand-editable, that is a user-visible behaviour decision — flag it rather than silently choosing.
- `rateManual` lives only in the in-modal `ItemRow` (UI state), not persisted, so a reopened quotation starts with auto-calc enabled; its stored `rate` is restored verbatim and only recomputed if the user edits a dimension. This satisfies requirement 6 without changing stored data.
- Existing amount/discount/GST/Part-A-B/total logic is untouched (requirement 7).

