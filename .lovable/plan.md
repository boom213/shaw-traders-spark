# Add Suppliers & Purchases

## Goal
Add a separate, auditable supplier-purchase ledger for money paid out, without changing counter sales, customer QR collections, trade credit, orders, or invoices.

## Database and accounting
- Apply one additive migration creating the three supplier enums, `suppliers`, and `supplier_ledger`, with explicit authenticated/service grants, staff-read RLS, indexes, checks, and the existing updated-at trigger.
- Add service-only functions to record supplier bills/payments/adjustments, calculate balances, page supplier summaries and ledger rows, void entries, and split existing QR-vendor totals into collected-via-QR versus paid-out.
- Lock affected supplier/ledger rows during writes. Recompute bill settlement oldest-first after payments or voids so voiding a payment restores the correct outstanding bills.
- Keep all categories visible. Classification affects labels and accounting groupings only; no category or entry can be hidden from authorized users.
- Add an explicit `show voided` input to the ledger-page function because the requested UI toggle and filter-faithful exports require it; voided entries remain excluded by default.
- Keep every existing vendor/payment table and function unchanged, including all historical rows.

## Server functions and exports
- Add supplier functions for paginated supplier lists, create/update supplier, record entry, void entry, filtered ledger data, CSV export, and PDF export.
- Require the existing Vendor Finance permission for every supplier read/write, dynamically load privileged database access only after authorization, and audit every mutation.
- Default ledger dates to the current month, validate ranges up to 366 days, coerce optional inputs defensively, and allow supplier creation with only a name and payment creation with only supplier plus amount.
- Return a non-blocking warning when same-day cash payments to one supplier exceed ₹10,000; save the entry and show the warning afterward.
- Build a dedicated A4 supplier-ledger PDF using the existing embedded fonts, business header, pagination, and safe text fitting. CSV and PDF exports will fetch the full filtered result set and include the active voided-state filter.

## Manager interface
- Add **Suppliers & Purchases** beside Vendor Payments in the Sales group and protect `/manage/suppliers` with the existing Vendor Finance permission.
- Build a two-tab page:
  - **Suppliers:** searchable, paginated supplier balances; add/edit supplier; record bill/payment; open a supplier-filtered ledger.
  - **Payments & bills:** current-month default, date presets, combined supplier/type/category/method/text filters, filtered totals, paginated rows, optional voided rows, and CSV/PDF downloads.
- Use the existing manager patterns: compact desktop tables, stacked mobile cards, a bottom filter sheet on mobile, action menus, entry/edit sheets, confirmation before voiding, existing loading indicators, and standard controls/tokens.
- Keep all optional fields optional. The supplier and amount remain the only required entry fields; category defaults to Other and date defaults to today.

## Existing Vendor Payments correction
- Add a new aggregate function that separates customer money collected through each QR from standalone money paid out.
- Update only the displayed totals and labels on Vendor Payments to show **Collected via QR** and **Paid out** separately, including the corrected monthly headline.
- Preserve all existing vendor creation, QR, payment, pagination, linking, and audit behavior.

## Verification
- Add focused tests for validation, filtered totals, category visibility, pagination, exports, ₹10,000 cash warning, FIFO settlement, payment void replay, and QR collected/paid-out separation.
- Verify with an authorized session: name-only supplier creation; amount-only payment; bill/payment/adjustment entry; combined filters; void display; CSV/PDF downloads; desktop/mobile layouts; and direct-route permission enforcement.
- Re-run the existing counter-sale/vendor-payment tests and exercise a Vendor QR counter payment end to end to confirm the legacy flow is unchanged.
- Confirm generated types, focused tests, type checks, runtime logs, and the final build are clean.
