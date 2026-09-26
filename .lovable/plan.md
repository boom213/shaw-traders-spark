# Reliable payments and vendor QR accounting

## Goal
Implement all four items from the accounting brief: automatically release abandoned online-payment stock, protect late-payment races, add complete wholesale payment records, identify who created counter sales internally, and introduce a secure vendor QR/payment ledger.

## Plan

### 1. Make abandoned online payments safe
- Add a protected scheduled endpoint that checks every 15 minutes for online orders still `pending` more than 30 minutes after placement. Cash-on-delivery (`cod_pending`) orders remain untouched.
- Reuse the existing row-locked, idempotent stock-release function for each candidate and isolate failures per order so one bad record does not stop the batch.
- Harden payment confirmation in the database: lock the order, refuse to turn a cancelled or stock-released order back into a paid order, and append the manual-review event exactly once when a late payment arrives.
- Update both Razorpay confirmation paths to respect the database result, avoid sending a normal order-confirmed notification for a released order, and give the checkout flow an honest manual-review response.
- Notify customers when an unpaid reservation is auto-cancelled and stock is released, using the existing notification system with duplicate protection.
- Enable the database scheduling/network extensions, then register one production schedule at `*/15 * * * *`, using the stable app URL and the existing secured cron authentication. These extensions are not currently enabled. This is 96 checks per day and keeps the effective release window near 30–45 minutes.

### 2. Make wholesale payment entries auditable
- Add a constrained payment-method field to `trade_ledger`: cash, UPI QR, bank transfer, wholesaler adjustment, or other; existing rows become `other`.
- Move ledger-entry creation and oldest-invoice settlement into one row-locked database operation so concurrent payments cannot settle the same debt inconsistently.
- Require positive amounts for invoices/payments; allow signed adjustment entries for correction instead of edit/delete. Require a reference or explanation for UPI QR, bank transfer, and wholesaler adjustments.
- Replace the compact payment box with amount, method, reference, and date controls; keep submission disabled until the complete save finishes.

### 3. Record the counter-sale creator internally
- Add `created_by_email` to counter sales and pass the authenticated staff email through the existing atomic sale-creation operation.
- Show staff name and email in the manager-only counter-sale details.
- Keep staff identity out of the customer invoice and every customer-facing order view.

### 4. Add the vendor QR/payables area
- Create `qr_vendors` and `vendor_payments` with explicit grants, row-level security, indexes, positive-amount validation, immutable payment history, and retirement through an `active` flag rather than deletion.
- Store QR images in a private `vendor-qr-codes` bucket. All permitted staff may view active QR codes through short-lived signed links; only super admins may upload, replace, or retire vendor records and QR images.
- Add secured server operations to list vendors/payments, manage vendors, record standalone vendor payments, and record customer-linked direct-to-vendor payments.
- Make a direct-to-vendor customer payment one atomic database operation: create one `trade_ledger` payment, settle receivables, create one linked `vendor_payments` row, and return both IDs. This prevents partial writes and double entry.
- Log vendor creation, changes, retirement, QR replacement, linked payments, and standalone payments in the existing audit log.
- Add `/manage/vendors` for manager, owner, and super-admin access, with vendor QR tiles, all-time/month totals, a chronological payment feed, a standalone “Pay a vendor” action, and wholesale cash collected this month. Vendor editing remains super-admin-only.
- Extend the wholesale payment form: for UPI QR, choose “my own UPI” or “direct to vendor”; direct-to-vendor requires an active vendor, amount, and payment date.

### 5. Permissions, navigation, and verification
- Add an explicit vendor-finance capability and route mapping so the new manager page never falls back to general staff access; independently enforce permissions in every server operation.
- Add the Vendors navigation item to desktop and mobile manager menus and unique no-index page metadata.
- Regenerate database types after the migration.
- Add focused database/integration tests for stale release idempotency, late payment after release, COD exclusion, linked-ledger atomicity, payment validation, adjustment corrections, vendor retirement/history, and direct-write denial.
- Add role tests proving staff cannot enter the vendor area, managers can record/select payments, and only super admins can change vendors or QR images.
- Verify the complete flows in the manager UI and confirm the app finishes with a clean build and no new runtime errors.

## Technical notes
- Database changes will be delivered as one migration and applied through Lovable Cloud, including grants before RLS policies for every new public table.
- Existing counter-sale payment records remain separate; this work enriches the broader wholesale receivables ledger without changing retail COD reconciliation.
- Vendor QR files will not use the public product-photo endpoint because payment destinations are sensitive and must not be anonymously replaceable or browsable.
- The scheduler will be configured separately from the schema migration because its deployment URL and secret are environment-specific.
