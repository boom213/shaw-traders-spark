# Reliable cart clearing and cart-flow testing

## Goal
Make the shopping cart clear reliably after a completed order, give customers a deliberate **Clear cart** action, and verify the standard cart journey across local and signed-in storage.

## Changes

### 1. Make cart clearing authoritative
- Refactor the shared cart store so clearing uses the latest cart state rather than a render-time snapshot.
- Cancel any pending list-sync write before clearing.
- Clear the browser cart immediately, then persist the empty cart for the signed-in customer without changing wishlist, saved items, or recently viewed items.
- Prevent an older delayed account-sync response from restoring purchased items after the cart has been cleared.
- Keep the applied coupon cleanup tied to successful checkout completion.

### 2. Clear only at the correct checkout outcome
- Keep cart contents when Razorpay is dismissed, fails, times out, or remains unconfirmed, so customers can retry safely.
- Clear the cart after verified Razorpay payment confirmation.
- Clear the cart after a successfully created Cash on Delivery order.
- Preserve the existing retry and reconciliation behavior; do not alter payment, stock, or order records.
- Complete cart persistence before navigating to the customer order page.

### 3. Add a customer-controlled Clear cart action
- Add **Clear cart** beside the cart heading when the cart contains items.
- Require confirmation before removing all items.
- Clear the applied coupon at the same time.
- Show success or failure feedback and retain the existing per-item Remove action.
- Keep the action usable on desktop and mobile, including for a guest cart.

### 4. Standard cart-flow coverage
Add focused automated tests for:
- add item, increase/decrease quantity, remove one item, and clear all;
- guest cart persistence through refresh and preservation through sign-in;
- signed-in cart synchronization and no stale-cart restoration after clearing;
- coupon removal when clearing;
- successful Cash on Delivery order clears the cart;
- verified Razorpay success clears the cart;
- Razorpay failure, dismissal, timeout, and unconfirmed payment preserve the cart;
- retry success clears the cart once;
- wishlist and saved-for-later data remain unchanged.

### 5. Browser verification
Exercise the real customer journey at desktop and mobile widths:
- add products from the shop and product page;
- edit quantities, remove an item, save/move an item, and use Clear cart;
- refresh and confirm persistence;
- place a Cash on Delivery order and confirm the cart badge and cart page are empty;
- verify failed/cancelled online payment leaves the cart available for retry;
- verify confirmed online payment clears the cart and opens the correct order page.

## Technical scope
- Frontend cart store, cart page, and checkout completion handling only.
- No database schema, catalogue, stock, order-state, or payment-provider changes.
- Reuse the existing design-system button/dialog/toast patterns.
