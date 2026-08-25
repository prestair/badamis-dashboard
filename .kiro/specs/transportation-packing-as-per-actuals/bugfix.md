# Bugfix Requirements Document

## Introduction

When transportation or packing charges are 0 in a quotation, the PDF and Excel exports display "0" instead of "As Per Actuals". This applies to all quotations including those imported through templates.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN a quotation with 0 Transportation Charges is exported to PDF THEN the system displays "0" in the totals table instead of "As Per Actuals"

1.2 WHEN a quotation with 0 Packing Charges is exported to PDF THEN the system displays "0" in the totals table instead of "As Per Actuals"

1.3 WHEN a quotation with 0 Transportation Charges is exported to Excel THEN the system displays 0 in the totals cell instead of "As Per Actuals"

1.4 WHEN a quotation with 0 Packing Charges is exported to Excel THEN the system displays 0 in the totals cell instead of "As Per Actuals"

### Expected Behavior (Correct)

2.1 WHEN a quotation with 0 Transportation Charges is exported to PDF THEN the system SHALL display "As Per Actuals" text for the Transportation Charges line in the totals table

2.2 WHEN a quotation with 0 Packing Charges is exported to PDF THEN the system SHALL display "As Per Actuals" text for the Packing Charges line in the totals table

2.3 WHEN a quotation with 0 Transportation Charges is exported to Excel THEN the system SHALL display "As Per Actuals" text in the Transportation Charges amount cell

2.4 WHEN a quotation with 0 Packing Charges is exported to Excel THEN the system SHALL display "As Per Actuals" text in the Packing Charges amount cell

2.5 WHEN a quotation has a numeric Transportation Charges amount > 0 THEN the system SHALL display the formatted numeric value in PDF and Excel exports as before

2.6 WHEN a quotation has a numeric Packing Charges amount > 0 THEN the system SHALL display the formatted numeric value in PDF and Excel exports as before

### Unchanged Behavior (Regression Prevention)

3.1 WHEN a quotation has Transportation or Packing Charges > 0 in exports THEN the system SHALL CONTINUE TO display the formatted numeric amount

3.2 WHEN calculating the grand total THEN the system SHALL CONTINUE TO treat 0 charges as 0 in arithmetic (no change to calculation logic)

3.3 WHEN the quotation form is used THEN the Transportation and Packing Charges input fields SHALL CONTINUE TO function as numeric inputs without any UI changes

3.4 WHEN quotations are imported through templates THEN the same rendering rules SHALL apply (0 = "As Per Actuals" in exports)
