# Razorpay Payment Reconciliation

## Goal
Add an Owner/Super Admin-only manager view that compares local online orders with current Razorpay data and clearly surfaces pending, failed, unmatched, and mismatched transactions.

## Admin view
- Add **Razorpay Review** under **Analytics**, using the existing Reports permission so Managers, Staff, and Sales Managers cannot access it.
- Show summary counts for **Needs attention**, **Pending**, **Failed**, **Mismatched**, and **Matched**.
- Provide status, date-range, and order/payment ID search filters with compact desktop rows and mobile cards.
- Show each order’s local payment state beside Razorpay’s current order/payment state, amount, currency, provider IDs, last event, and a plain-language reason when attention is needed.
- Link matched orders to the existing order detail page; late-payment reviews continue using the existing audited resolution control there.
- Include a separate unmatched-callback section for signed Razorpay events that could not be linked to an order.

## Live reconciliation
- Add a server-only reconciliation function that requires the **Reports** capability before reading payment data or contacting Razorpay.
- For each paginated online-order row, fetch the current Razorpay order and associated payments using the securely stored credentials; never expose the secret or raw provider payloads.
- Classify issues consistently: missing provider order, provider payment failed, local pending while Razorpay is paid/captured, local paid without a captured provider payment, order/payment amount mismatch, non-INR currency, provider-order ID mismatch, and existing late-payment review flags.
- Keep this screen observational: it will not silently mark orders paid, refund, release stock, or overwrite audit history. Existing signed callbacks and order-detail review actions remain authoritative.
- Handle provider outages per row so one failed lookup does not blank the whole page; provide manual refresh and clear “could not check” messaging.

## Technical details
- Reuse the current Razorpay HTTP helper style instead of installing the Node SDK.
- Exclude Counter Sales from reconciliation and page results at 8 rows, matching manager conventions.
- Read signed `payment_events` only through privileged server code and project a safe, minimal display shape.
- Add focused tests for access control, classification rules, amount/currency mismatches, unmatched events, provider errors, and pagination.
- Record the new server-side reconciliation boundary in the project engineering notes and update the roadmap.

## Verification
- Run focused payment, permissions, and reconciliation tests.
- Verify Owner/Super Admin access, blocked Manager access, filters, refresh, order links, desktop/mobile layouts, and current build health.
