# Require sign-in at checkout

## Changes
- Block `startCheckout` immediately when no signed-in customer is present, before catalogue checks or order creation.
- On `/checkout`, wait for account status; guests see only a sign-in step using the existing mobile-code and Google options.
- Let the existing checkout form appear automatically after sign-in without clearing or changing the guest cart.
- Leave product browsing, adding to cart, and `/cart` fully available to guests.

## Verification
- Confirm a direct signed-out checkout call returns “Please sign in to place an order.”
- Confirm signed-out `/checkout` hides address, delivery, payment, and order controls.
- Confirm `/cart` remains usable while signed out, and checkout appears after authentication.
- Run focused checkout tests and confirm the preview builds cleanly.
