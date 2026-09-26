# Optional vendor QR with linked counter-sale payments

## Outcome
- Keep the **Vendor QR** dropdown optional in the counter-sale payment popup.
- When no vendor is selected, record only the customer’s counter-sale payment.
- When a vendor is selected, also record that amount against the vendor and show it on **Vendor Payments**.
- Keep the QR preview, UPI ID, UTR requirement, balance checks, and staff attribution.

## Changes
- Pass the optional selected vendor from the counter-sale popup to the secure payment operation.
- Update the database payment operation so both records are created atomically when a vendor is selected: the counter-sale receipt and its linked vendor-payment entry.
- Preserve normal counter-sale recording when the vendor is blank; no vendor-payment row is created in that case.
- Save the vendor link on the counter-sale receipt so its payment details show which vendor was selected.
- Refresh the Vendor Payments data after a linked counter-sale payment and keep its history label identifying customer-linked payments.
- Update the project accounting rule to reflect that vendor selection is optional but becomes an accounting link when used.

## Verification
- Record a Vendor QR payment without selecting a vendor and confirm it succeeds without adding vendor history.
- Record one with an active vendor and confirm the customer receipt, vendor payment, totals, and history all update together.
- Confirm inactive or invalid vendors cannot be linked, UTR remains mandatory, and overpayments remain blocked.
- Run focused payment tests and verify both manager pages with a signed-in manager account.

## Technical details
- Recreate the existing compatible database routine rather than changing its call signature.
- Use one row-locked database transaction and the existing `vendor_payments.linked_ledger_id` relationship to prevent partial or duplicate accounting entries.
