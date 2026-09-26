# Vendor QR selection in offline payments

## Goal
Let managers choose an active vendor QR inside **Record offline payment**, display that QR for scanning, and save the customer receipt plus its linked vendor payment as one auditable transaction.

## What will change
- Add **Vendor QR** as a payment method in the counter-sale payment popup.
- When selected, show a required dropdown of active vendors and display the selected vendor’s QR code and UPI ID.
- Keep Cash, UPI, Bank transfer, Cheque, and Other behavior unchanged.
- Require a UTR/reference for Vendor QR payments, as with other electronic payments.
- Reset the selected vendor whenever the popup closes or another payment method is chosen.
- Show the selected vendor name in the recorded payment details.

## Accounting and safety
- Extend counter-sale payment records with an optional vendor link.
- Add a new compatible payment-recording operation rather than breaking the currently deployed one.
- In one database transaction: validate the open sale and remaining balance, validate the active vendor, save the customer receipt, save the trade-ledger payment, create the linked vendor-payment record, and update paid status when settled.
- Preserve the staff member’s name, email, payment date, reference, notes, vendor, and amount in the audit trail.
- Keep QR images private and display them through short-lived signed links available only to authorized staff.

## Verification
- Test Vendor QR selection, QR display, required vendor/reference validation, successful linked recording, balance updates, and payment history.
- Confirm inactive vendors do not appear and cannot be submitted directly.
- Confirm ordinary offline payment methods still work unchanged.
- Verify manager access and a clean preview build.
