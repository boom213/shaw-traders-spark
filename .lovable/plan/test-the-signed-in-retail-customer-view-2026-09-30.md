# Test the signed-in retail customer view

## Scope
- Sign in as an existing normal retail customer with no staff or approved wholesale access.
- Test the live preview on desktop and mobile.
- Avoid completing a real payment or creating an unintended order.

## Checks
1. Verify the customer header, navigation, and account menu show customer options and no staff or wholesale controls.
2. Browse the shop, open a product, add it to the cart, change quantity, save it for later, restore it, and clear/remove items.
3. Proceed to checkout and confirm the signed-in customer sees saved-address, delivery, and payment steps rather than a sign-in prompt.
4. Confirm checkout rejects empty or zero-value carts and retains the cart when navigating back.
5. Review the Account page for orders, wishlist/saved items, addresses, profile controls, and the absence of staff-only or wholesale-only sections.
6. Check browser errors, failed requests, layout issues, and the same core journey at a mobile viewport.
7. Report each result with the affected screen and severity. If a defect is found, identify its cause and propose a focused repair before changing behavior.

## Confirmed current behavior
- Guests may build a cart, but checkout requires sign-in.
- Server-side checkout allows only signed-in retail customers.
- Approved wholesale and staff accounts are directed to their separate workflows.
