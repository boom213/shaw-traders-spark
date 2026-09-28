# Simplify vendors and make split counter payments auditable

## Outcome
- Treat vendors as third-party customer-payment collectors, separate from suppliers.
- Manage vendors by name and active/retired status only; preserve historical QR and UPI data without displaying or deleting it.
- Filter vendor payment history by vendor and date, with accurate filtered counts and totals.
- Record cash, vendor, bank, UPI, and cheque splits in one payment session.
- Track pending, cleared, bounced, and voided receipts without deleting accounting history.

## Database changes
1. Apply three additive migrations in order:
   - Make `qr_vendors.qr_image_path` nullable; retain the existing table, QR/UPI columns, rows, storage files, grants, and policies.
   - Add `cheque` to `trade_payment_method` in a migration containing only the enum alteration.
   - Add receipt status, cheque clearance date, and void metadata to `counter_sale_payments`, plus supporting indexes and validation for allowed statuses.
2. Replace `record_counter_sale_payment_with_vendor` without changing its signature:
   - Accept both `Vendor` and historical `Vendor QR` labels.
   - Map vendor payments to UPI, bank transfers correctly, and cheques to the new cheque ledger method.
   - Require references for UPI, Vendor, Bank transfer, and Cheque.
   - Insert cheques as pending and other receipts as cleared.
   - Keep the sale, receipt, customer ledger entry, optional linked vendor payment, order event, and settlement update in one locked transaction.
3. Add secured payment-correction operations:
   - Void a receipt by stamping its audit fields and adding one reversing ledger adjustment; never delete it.
   - Mark a pending cheque cleared, or bounced with one idempotent reversal.
   - Recompute the invoice from non-voided, non-bounced receipts, reopening payment status and invoice settlement when coverage falls below the total.
   - Prevent repeated void/bounce actions from reversing the same receipt twice.
4. Update payment-report database functions so:
   - Cheques appear in the Cheque column, including the new ledger method.
   - Voided and bounced receipts do not count as collected revenue.
   - Pending cheques remain visible and distinguishable but are not included in money-received totals.
   - Historical `Vendor QR` and new `Vendor` labels remain grouped consistently.
5. Keep all new correction functions private to trusted server operations with `SECURITY DEFINER`, a fixed search path, revoked public/client execution, and service-only grants.

## Vendors page
- Remove QR upload, QR previews, UPI inputs, and UPI display.
- Create and update vendors with name and active/retired status only; keep vendor changes Super Admin-only and audited.
- Rename the vendor section and collection labels to plain vendor terminology.
- Add optional Vendor, From, and To filters plus Clear above payment history.
- Apply filters server-side to both rows and count, reset pagination when filters change, and show `N payments · ₹X` for the full filtered result.
- Pass the active vendor/date filters into the existing audited CSV export while preserving its 10,000-row cap.
- Keep collected-via-vendor and paid-out values separate so customer collections never overlap supplier or payout totals.

## Counter Sales
- Rename `Vendor QR` to `Vendor`, while continuing to display historical payment labels correctly.
- Reduce vendor setup data to active vendor IDs and names; remove signed QR links, previews, and UPI text.
- For Vendor payments, show the optional vendor selector and “Recorded in Vendor Payments.”
- Require UTR/reference for UPI, Vendor, and Bank transfer. For Cheque, require a cheque number and allow an optional cheque date.
- Keep the payment dialog open after each successful partial payment while a balance remains. Update Remaining from the server result and reset only amount, method, reference, cheque date, note, and vendor selection for the next split.
- Close and fully reset the dialog only when the sale is covered or the user closes it.
- Extend sale details with:
  - Received total from cleared, non-voided receipts.
  - Awaiting clearance total from pending cheques.
  - Per-payment status badges and struck-through bounced/voided amounts.
  - A payment menu for Mark cleared, Mark bounced, and Void payment, with confirmations and required reasons for destructive corrections.
- Refresh counter sales, customer balances, vendor totals, and payment reports after recording or correcting a receipt.

## Server operations and audit
- Return payment status, clearance date, and void metadata in counter-sale payment rows.
- Add manager-protected server operations for voiding receipts and changing cheque status.
- Validate all payment IDs, statuses, dates, and reason lengths on the server.
- Write `counter_sale.payment_voided` and `counter_sale.cheque_status` audit entries with actor, receipt, order, amount, old/new state, and reason—without exposing private audit details to customers.
- Preserve sale creation, GST, pricing, stock, invoices, supplier accounting, and customer-facing order behavior.

## Verification
- Create and retire a name-only vendor.
- Record a ₹1,00,000 sale as ₹50,000 cash + ₹20,000 Vendor + ₹30,000 pending cheque without reopening the dialog.
- Confirm the linked vendor entry appears once, Remaining reaches zero, Received is ₹70,000, and Awaiting clearance is ₹30,000.
- Mark the cheque cleared and confirm Received becomes ₹1,00,000 without duplicating ledger entries.
- Repeat with a bounced cheque and confirm the ₹30,000 balance returns and the invoice reopens exactly once.
- Void the cash receipt and confirm its ₹50,000 balance returns, the amount is excluded from collected totals/reports, and history remains visible.
- Confirm Vendor + date filters compose across rows, totals, pagination, and CSV export.
- Confirm historical `Vendor QR` records still render and report correctly.
- Run focused accounting tests, payment-report tests, type checks, a clean build, and signed-in desktop/mobile browser checks of both manager pages.

## Technical details
- Preserve the current RPC signature so deployed callers remain compatible.
- Use database row locks and idempotent state transitions for record, clear, bounce, and void actions.
- Treat pending cheque value as invoice coverage but not cash received; bouncing or voiding removes that coverage and restores the customer balance.
- No new libraries and no changes to supplier tables or flows.
