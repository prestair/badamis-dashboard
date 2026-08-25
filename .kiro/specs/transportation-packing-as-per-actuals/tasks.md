# Implementation Plan

- [x] 1. Update QuotationDownload.tsx - PDF export conditional rendering
  - In `buildQuotationPDF` function, locate the totals body array where transportation and packing charges are rendered
  - Replace `["TRANSPORTATION CHARGES", fmtNum(safeNum(props.discounts.transportationAmount))]` with conditional: if amount is 0 show "As Per Actuals", otherwise show formatted number
  - Replace `["PACKING CHARGES", fmtNum(safeNum(props.discounts.packingAmount))]` with same conditional logic
  - Taxable value calculation line remains unchanged (still uses numeric 0 in arithmetic)
  - This applies to all quotations including those imported through templates (same export code path)
  - _Requirements: 2.1, 2.2, 2.5, 2.6, 3.1, 3.2, 3.4_

- [x] 2. Update QuotationDownload.tsx - Excel export conditional rendering
  - In `downloadExcel` function, locate the `pushT` calls for transportation and packing charges
  - For transportation: if `props.discounts.transportationAmount === 0`, push "As Per Actuals" text in the amount cell instead of numeric 0
  - For packing: if `props.discounts.packingAmount === 0`, push "As Per Actuals" text in the amount cell instead of numeric 0
  - When amount > 0, continue using `safeNum(props.discounts.transportationAmount)` as before
  - May need to modify `pushT` helper or create a variant that accepts string for the amount column
  - Taxable value calculation remains unchanged
  - This applies to all quotations including those imported through templates (same export code path)
  - _Requirements: 2.3, 2.4, 2.5, 2.6, 3.1, 3.2, 3.4_

- [x] 3. Verify the fix works correctly
  - Build the project to ensure no TypeScript errors
  - Manually verify: create a quotation with 0 transportation and 0 packing charges, download PDF — confirm "As Per Actuals" appears for both lines
  - Manually verify: same quotation, download Excel — confirm "As Per Actuals" appears in the amount cells
  - Manually verify: create a quotation with transportation = 5000 and packing = 3000, download PDF — confirm numeric values "5,000" and "3,000" appear
  - Manually verify: same quotation, download Excel — confirm numeric values appear
  - Verify grand total calculation is correct in both scenarios
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 3.1, 3.2, 3.3, 3.4_
