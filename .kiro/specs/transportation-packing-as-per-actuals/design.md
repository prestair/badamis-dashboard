# Transportation & Packing "As Per Actuals" Export Fix — Design

## Overview

Simple export-only fix: when transportation or packing charges are 0 in a quotation, render "As Per Actuals" in PDF and Excel exports instead of "0". No form UI changes. No data model changes.

## Bug Condition

The bug triggers when `transportationAmount === 0` or `packingAmount === 0` and the quotation is exported to PDF or Excel. The export functions render the numeric 0 literally.

## Root Cause

In `components/QuotationDownload.tsx`:
- Excel: `pushT("TRANSPORTATION CHARGES", safeNum(props.discounts.transportationAmount), ts)` always renders the numeric value
- PDF: `["TRANSPORTATION CHARGES", fmtNum(safeNum(props.discounts.transportationAmount))]` always formats as a number
- Neither has a conditional to substitute text when the value is 0

## Fix

### File: `components/QuotationDownload.tsx`

**Excel export (`downloadExcel` function):**
- For transportation charges: if `props.discounts.transportationAmount === 0`, render "As Per Actuals" text in the amount cell instead of 0
- For packing charges: if `props.discounts.packingAmount === 0`, render "As Per Actuals" text in the amount cell instead of 0
- When > 0: render numeric value as before

**PDF export (`buildQuotationPDF` function):**
- For transportation charges: if `props.discounts.transportationAmount === 0`, render "As Per Actuals" text instead of "0"
- For packing charges: if `props.discounts.packingAmount === 0`, render "As Per Actuals" text instead of "0"
- When > 0: render formatted number as before

### No changes to:
- `components/QuotationModal.tsx` — form stays as-is
- `lib/quotationAudit.ts` — data model unchanged
- `context/QuotationContext.tsx` — context unchanged

## Correctness Properties

Property 1: For any quotation with transportationAmount === 0, PDF and Excel exports show "As Per Actuals" for that line.
Property 2: For any quotation with packingAmount === 0, PDF and Excel exports show "As Per Actuals" for that line.
Property 3: For any quotation with transportationAmount > 0 or packingAmount > 0, exports continue showing the numeric value.
Property 4: Grand total calculation is unchanged regardless of the display text.
