# Fix intermittent cart item loading

## Goal
Make saved guest and customer carts recover automatically when catalogue item loading briefly fails after an update, without deleting valid cart contents or allowing checkout with unknown totals.

## Changes
- Keep the current safety rule: reconcile/remove unavailable product IDs only after a successful catalogue response.
- Add bounded automatic retries to the cart-products request for temporary network or deployment-transition failures.
- Make **Try again** perform a clean fresh request and clearly retain every saved cart item while recovery is in progress.
- Keep checkout disabled until product details and totals are successfully verified.
- Ensure cart, saved-for-later, and checkout all use the same recovered product result and do not show false “unavailable” rows during a request failure.

## Verification
- Test a guest cart and a signed-in retail cart through add, reload, cart, and checkout.
- Simulate a failed product request followed by success; confirm the cart recovers without losing items.
- Simulate a persistent failure; confirm the saved cart remains intact, retry remains available, and checkout stays blocked.
- Confirm truly deleted products are removed only after a successful lookup.
- Check desktop and mobile layouts, focused cart tests, and the preview build.

## Current finding
The screenshot shows the catalogue lookup failure state, not deleted cart products. A fresh live-site guest-cart test currently succeeds, so this appears intermittent—most likely during a temporary request or deployment transition—and needs recovery hardening rather than cart-data deletion.
