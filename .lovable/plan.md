# Retail-only online purchasing

## Goal
Only signed-in retail customers can add products to the cart, use Buy Now, change a cart, or proceed through online checkout. Guests can browse normally, and their existing cart remains saved until they sign in.

## Customer experience
- On product cards and product detail pages:
  - Signed-in retail customers see **Add to Cart** and **Buy Now** as normal.
  - Guests see a **Sign in to buy** action instead of purchase buttons.
  - Wholesale and staff accounts do not see retail purchase buttons; they receive the appropriate trade or staff route instead.
- Keep product browsing, search, pricing, enquiries, WhatsApp, wishlist behavior, and product details unchanged.
- Preserve a guest’s current cart locally. After eligible retail sign-in, the existing merge behavior restores those items.
- On the cart page, guests and ineligible accounts may review preserved items, but cannot change quantities, move saved items into the cart, or proceed to checkout.

## Enforcement
- Add one reusable purchase-access check backed by the signed-in account’s existing profile and staff-role records.
- Define eligibility as:
  - authenticated;
  - `customer_type = retail`;
  - no staff role.
- Apply that check consistently to product cards, product details, account reorder, saved-item restoration, and any bulk/cart mutation entry point.
- Enforce the same rule inside `startCheckout` and `retryPayment`, so direct requests cannot bypass the screen controls.
- Keep Counter Sales and manager-side ordering unchanged.

## Safety and compatibility
- No database migration or account conversion.
- Do not delete guest carts or existing saved items.
- Do not alter catalogue visibility, checkout pricing, stock reservation, Razorpay, COD, or order reconciliation logic.
- Approved wholesale accounts retain their separate trade and Counter Sales workflows but cannot use retail online checkout.

## Verification
- Test guest, signed-in retail, approved wholesale, and staff sessions.
- Verify purchase buttons and cart controls appear only for retail customers.
- Verify a guest cart survives sign-in and becomes usable for a retail customer.
- Verify direct checkout requests from guests, wholesale accounts, and staff are rejected server-side.
- Verify retail checkout still reaches Razorpay and COD normally.
- Check desktop and mobile product lists, product details, cart, and checkout.
