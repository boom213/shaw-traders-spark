# Make Razorpay Payments Recoverable and Auditable

## Goal
Protect all three Razorpay paths—parts checkout, quote checkout, and scooter token bookings—so a captured payment is recorded even if the browser closes, verification is delayed, an order was cancelled, or a refund starts in Razorpay.

## Delivery order

### 1. Secure and activate scheduled work
- Make `https://shawtradersev.com` the single canonical business URL.
- Replace the four cron endpoints’ custom checks with the generated rotating Bearer-token checker.
- Reduce stale-order cleanup batches from 100 to 25 while preserving the 30-minute expiry.
- Add migration 0048 to remove both the known legacy `release-stale-online-orders` job and any same-name replacement jobs, then schedule:
  - stale-order release every 5 minutes;
  - cart reminders hourly;
  - daily summary at 9:00 pm IST;
  - service reminders at 9:00 am IST.
- Read the site URL and cron token from database Vault; commit no credentials.
- Verify the scheduled-job list, execution history, and HTTP responses. Use a job-id join for execution history because this database’s run-history view has no `jobname` column.

### 2. Make scooter token payments webhook-safe
- Add migration 0049 with booking attribution on payment events, booking review fields, and atomic idempotent booking-payment/review functions.
- Extend the Razorpay webhook to resolve either an order or a scooter booking, preserve duplicate-event handling, and notify only after a fresh successful booking transition.
- Route browser verification through the same atomic booking-payment function.
- Stop showing “confirmed” when verification fails; show a calm do-not-pay-again recovery message instead.
- Add booking payment-state lookup and recovery polling.
- Add staff filters and badges for payment review and tokens unpaid longer than 48 hours; do not auto-cancel bookings.

### 3. Surface money received after cancellation
- Add migration 0050 with order review fields, a partial review index, the minimally changed `mark_order_paid`, and atomic resolution functions.
- Add staff-only review counts and audited resolve actions for orders and bookings.
- Extend paginated order and booking reads with composable server-side status/payment filters.
- Show destructive “Payment needs review” badges, note-based resolution dialogs, and a dashboard alert only when unresolved cases exist.

### 4. Recover delayed browser confirmations
- Add one shared payment-confirmation hook: check immediately, poll every 3 seconds, hide failure controls for 12 seconds, and stop after 90 seconds or on unmount.
- Use it in standard checkout and quote checkout.
- Treat “already paid” during retry as success and finish the existing order flow.
- Release quote-reserved stock immediately when Razorpay is dismissed or fails.
- Apply equivalent recovery to scooter bookings, showing the booking link only with accurate status messaging.

### 5. Synchronize Razorpay refunds
- Add migration 0051 with a plain unique provider-refund index and an idempotent refund-total synchronization function.
- Handle `refund.created`, `refund.processed`, and `payment.failed` without changing the webhook’s signature, duplicate, or retry contracts.
- Keep unmatched refund events recorded without inventing an order link.
- Make staff-issued refunds use the same authoritative total recomputation while retaining the over-refund guard, audit entry, and customer notification.

## Technical safeguards
- Keep pricing, GST, counter-sale, trade-credit, stock-release ownership, roles, capabilities, and the generated cron helper unchanged.
- Use additive migrations only, service-role-only grants for privileged functions, row locks for payment transitions, and no secrets in source or migrations.
- Preserve the existing 200 duplicate / 401 bad signature / 500 genuine failure webhook behavior.
- Record the payment-reliability invariants in the project engineering notes.

## Verification
- Add focused tests for order and booking payment idempotency, paid-after-cancellation review flags, resolution, refund deduplication/totals, webhook event routing, polling timing, quote abandonment, and filter composition.
- Run existing checkout, booking, signature, webhook, order-flow, permission, counter-sale, trade-credit, and invoice regressions.
- Exercise desktop and mobile customer/staff flows against the preview.
- Verify the four cron jobs and recent HTTP responses after Vault values are present.
- On the deployed HTTPS preview with Razorpay test webhooks, run the brief’s end-to-end scenarios: browser-closed capture, webhook replay, booking recovery, quote dismissal, 30-minute release, late-payment review, network-drop recovery, and panel/webhook refunds.

## Owner actions and deployment gates
- Before migration 0048 takes effect, store `site_url = https://shawtradersev.com` and the current cron token in database Vault. The old scheduled job currently exists and uses the insecure public-key scheme, so the auth change and replacement schedule must ship together.
- Confirm `shawtradersev.info` permanently redirects to `shawtradersev.com` without being used as the scheduler target.
- Register the deployed preview webhook in Razorpay test mode for `payment.captured`, `order.paid`, `payment.failed`, `refund.created`, and `refund.processed` before webhook end-to-end testing.
- Live launch remains gated on separate live keys, a separate live webhook secret, matching public/Vault site URLs, cron re-verification, and one low-value real order plus refund.
- GST credit notes and refund tax allocation remain intentionally out of scope.
