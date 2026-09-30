# Restore open storefront browsing

## Goal
Make every storefront and trade page publicly browsable again for guests, customers, trade accounts, and staff. Keep the existing checkout eligibility checks as the single user-facing ordering gate, with server-side order authorization unchanged.

## Changes
- Move `brand`, `cart`, `categories`, category details, `checkout`, `offers`, product details, scooter list/details, `shop`, `trade`, and `trade/pad` from the customer-only route folder back to top-level routes.
- Update only the route identifiers required by their new locations and the checkout import that points to the cart route module; preserve each page’s existing behavior and content.
- Remove both `_authenticated` route layouts so these pages have no sign-in or staff redirect before rendering.
- Keep `customerShoppingPath` and the account sign-in return handling unchanged.
- Leave `customerPageAccess` in place but unused, as requested.
- Do not change purchase classification, checkout eligibility, cart/wishlist synchronization, pricing, order creation authorization, or staff navigation visibility.
- Replace regression tests that expect route blocking with tests proving the storefront routes are top-level/public and that checkout still contains its guest, staff, and trade ordering gates.
- Update the project rule and roadmap to reflect: browsing is public; retail checkout remains signed-in retail-only.

## Verification
- In a fresh signed-out browser, directly open Shop, category, product, cart, offers, brands, scooters, and trade pages with no redirect.
- Add a guest cart item and confirm `/checkout` renders its inline sign-in prompt while retaining the cart.
- With a staff session, confirm all storefront/trade URLs render without redirect, while checkout shows **Retail checkout only** and links to the staff portal.
- Confirm staff shopping shortcuts remain hidden in the account menu, header, mobile tabs, and account page.
- Run focused route/access/cart tests, type checking, and confirm the preview build is clean.

## Out of scope
- No changes to retail purchase eligibility, order/payment logic, wholesale workflows, staff permissions, or navigation decluttering.
