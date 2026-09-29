# Customer order payment clarity

## Goal
Show customers the fulfilment status and payment status as separate facts, so a failed or pending payment never looks successfully confirmed.

## Changes
- Update the order-detail header to reflect payment state:
  - **Paid:** keep the successful order-confirmation message.
  - **Failed:** show a clear payment-failed message and avoid the success icon/copy.
  - **Pending:** show payment awaiting confirmation.
  - **COD pending:** explain that payment is due on delivery.
  - **Refunded:** show the refunded state separately from fulfilment.
- Add labelled **Payment mode** and **Payment status** rows in the customer’s “Payment & delivery” section.
- Add payment mode/status to signed-in customer order cards in **My Account** and **Track Order**, while retaining the existing fulfilment status.
- Use readable customer labels rather than raw stored values such as `cod_pending`.
- Keep order fulfilment and payment status independent; do not change payment records, stock, delivery status, or Razorpay reconciliation.

## Verification
- Add focused tests for paid, failed, pending, COD-pending, and refunded display labels and header messaging.
- Verify the order detail, My Account list, and Track Order list on desktop and mobile.
- Confirm the project builds successfully.

## Current order note
Order `STE-260929-9068` is currently stored as **UPI / Paid / Delivered**, with a payment-received event. The display fix will prevent any future failed payment from being presented with unconditional success messaging.
