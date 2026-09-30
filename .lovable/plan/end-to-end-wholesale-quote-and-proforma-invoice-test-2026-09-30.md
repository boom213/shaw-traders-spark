# End-to-end wholesale quote and Proforma Invoice test

## Test journey
1. Sign in as the approved wholesale test customer `trade@shaw-test.local`.
2. Use the Bulk Order Pad with a currently visible, stocked part, add it to the quote list, and submit a new quote request through the customer screens.
3. Confirm the new quote appears in **My quotes** as awaiting pricing and record its quote number for traceability.
4. Sign in as the Owner test account `owner@shaw-test.local`, open **Wholesale Quotes**, and locate that exact quote.
5. Enter a real unit price, a future validity date, and 18% GST; verify both inclusive/exclusive controls and use the selected treatment to send the priced quote.
6. Download the Manager copy of the Proforma Invoice and verify the browser receives the expected `Proforma-Invoice-<quote-number>.pdf` file.
7. Sign back in as the wholesale customer, confirm the priced amount and GST-aware total in **My quotes**, then download the customer copy.
8. Inspect the downloaded PDF visually and by extracted text: quote/customer details, products, quantities, prices, GST calculation, grand total, validity date, and “not a tax invoice” notice must be present; payment details and rack locations must be absent.
9. Confirm the final quote and GST values in the database, and review browser console/network output for errors.

## Safety and evidence
- This intentionally creates one real quote and prices it, but does not create an order, payment, stock movement, or customer charge.
- Existing quotes will not be edited.
- Both account sessions will be authorized through the managed test-session flow.
- The result will include the created quote number, selected GST treatment, downloaded filename, PDF inspection findings, and any issue found.
