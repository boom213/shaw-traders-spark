# Counter-Sales Payment Dashboard

## Goal
Add a dedicated **Payment Reports** page for Manager, Owner, and Super Admin users. It will show how counter-sale payments were collected, keep storefront online payments in a separate section, and provide daily, weekly, monthly, and custom-range reporting with charts and downloads.

## Dashboard layout
- Add **Payment Reports** under the manager panel’s **Insights** navigation.
- Add date controls:
  - **Daily**: today
  - **Weekly**: last 7 calendar days
  - **Monthly**: current calendar month
  - **Custom**: inclusive From and To dates
- Use Indian local dates consistently for filtering and display.
- Show top summary figures for counter-sale amount collected, number of counter payments, online amount received, and refunds/net received where applicable.

## Counter-sale payments section
- Use recorded `counter_sale_payments` transactions as the source of money received; do not count the counter-sale invoice total as payment.
- Add a counter-sales-only stacked bar chart showing collected amount over time, split by payment method such as Cash, UPI, Vendor QR, Bank transfer, Cheque, and Other.
- Add a compact payment-method summary so managers can quickly compare how customers paid.
- Show a detailed table with date, invoice, customer, amount, method, vendor when selected, reference/UTR, note, and staff member who recorded it.
- Give this table its own server-side pagination, page total, Previous/Next controls, horizontal overflow on narrow screens, and a bounded vertical scroll area when many rows are visible.

## Online payments section
- Place storefront online payments below the counter-sales section, visually separate and without adding them to the counter-sales graph.
- Include successful online payments and recorded refunds; exclude pending, failed, Cash on Delivery, offline credit, and counter-sale invoices.
- Show date, order number, customer, provider, payment/reference ID, gross amount, refunded amount, net amount, and status.
- Give this section independent server-side pagination plus horizontal and bounded vertical overflow.
- Use confirmed payment records where available, with a safe legacy fallback for older paid online orders so existing history is not silently omitted.

## Reports and downloads
- Add **Download CSV** for the selected date range with summary totals followed by clearly separated counter-sale and online-payment transaction data.
- Add **Download PDF** for the selected date range using the existing embedded-font, logo, and paginated A4 report style.
- The PDF will include the selected period, summary totals, counter-sale method breakdown, chart summary, and separate transaction tables for counter sales and online payments.
- Exports will include the complete selected period, not only the currently visible table page.

## Data accuracy and performance
- Add database reporting functions that aggregate chart totals and return each transaction list one page at a time.
- Treat `counter_sale_payments` as the authoritative counter-payment ledger.
- Treat confirmed non-counter online orders as online receipts, subtracting recorded refunds for net totals.
- Do not sum `orders.total`, `trade_ledger`, `vendor_payments`, and counter receipts together; those records overlap and would double count money.
- Keep vendor-linked counter payments in the counter-sales section; the vendor-payment record remains a reconciliation entry, not extra revenue.
- Add date/payment lookup indexes only where the query plan needs them.
- Reuse the manager panel’s refresh-on-focus behavior so operational totals stay current.

## Access and integration
- Protect the new page with the existing **reports** permission, available to Manager and above.
- Add route-specific title, description, social metadata, and `noindex` settings consistent with the manager panel.
- Keep the existing Counter Sales, Vendor Payments, order, invoice, and payment-recording workflows unchanged.

## Verification
- Test date boundaries, empty periods, partial counter payments, multiple methods, optional vendor QR, refunds, and independent pagination.
- Confirm totals and chart buckets match direct database calculations without double counting.
- Verify CSV contents and visually inspect every generated PDF page for clipping, overlaps, font issues, and table pagination.
- Verify desktop and mobile layouts, both overflow areas, page controls, downloads, and Manager/Staff access restrictions in the signed-in preview.

## Technical details
- Add a protected reporting server-function module and database RPCs for summaries, chart series, method totals, and paginated rows.
- Add a new TanStack route at `/manage/payment-reports` and register it in the manager route-permission map and navigation.
- Use a responsive chart library for the stacked counter-payment chart and the project’s existing semantic color tokens.
- Generate exports server-side; use the existing edge-compatible PDF tooling and embedded fonts rather than browser print output.
