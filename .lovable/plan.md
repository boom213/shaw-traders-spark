# Make Vendor QR selection optional and display-only

## Outcome
- Keep **Vendor QR** as an offline payment method.
- Make the vendor dropdown clearly optional.
- Selecting a vendor only displays its QR code, vendor name, and UPI ID for scanning.
- Allow **Record payment** whether or not a vendor QR is selected.
- Continue requiring the UTR/reference for Vendor QR payments.

## Fix
- Remove the form rule that blocks submission when no vendor is selected.
- Stop treating the selected QR as accounting data when recording the customer payment.
- Update the server validation and payment transaction so a Vendor QR payment can be recorded without a vendor.
- Do not create or link a vendor payout from this popup, even when a QR was selected; vendor payouts remain managed separately.
- Preserve the customer receipt, wholesale ledger payment, order status, staff attribution, and audit trail.

## Verification
- Confirm Vendor QR payment records successfully with no dropdown selection.
- Confirm selecting a vendor displays the correct QR and the payment still records normally.
- Confirm UTR remains mandatory and amount/balance safeguards still apply.
- Run the focused payment tests and verify the popup in the preview.

## Technical details
- Adjust the payment popup, `recordCounterPayment`, and the database payment routine together so browser and server rules match.
- Record the selected method as Vendor QR/UPI without persisting `vendor_id` or creating `vendor_payments` rows from this display-only selector.
