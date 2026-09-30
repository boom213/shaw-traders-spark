# Move sign-in to checkout

## Goal
Let signed-out visitors browse parts, add available retail products to their cart, change quantities, save/remove items, and use **Buy Now** without being stopped by a sign-in prompt. Ask them to sign in only after they enter checkout.

## Changes
- Replace the guest-facing **Sign in to buy** state on product cards and product details with the normal **Add to Cart** and **Buy Now** actions.
- Make **Buy Now** add the item and open checkout; checkout will retain the cart and show the existing sign-in screen.
- Allow guests to manage cart quantities, remove items, save for later, and move saved items back into the cart.
- Change the cart’s main action for guests to **Proceed to Checkout**, linking to checkout instead of the account page.
- Keep wholesale and staff accounts on their existing dedicated ordering/portal paths; this change only relaxes the signed-out guest experience.
- Keep the server-side retail-account check when an order is actually submitted, so direct requests cannot place anonymous, wholesale, or staff orders.

## Validation
- Update access tests for guest cart-building versus final order placement.
- Test signed-out catalogue → add part → cart editing → checkout sign-in.
- Test signed-in retail checkout and confirm wholesale/staff purchase restrictions remain unchanged.
- Check desktop and mobile layouts, focused tests, and the preview build.

## Technical details
Use a separate client-side “can build retail cart” decision for guests and eligible retail customers while preserving `retailPurchaseAccess()` as the authoritative server-side checkout rule. No database or order-pricing changes are required.
