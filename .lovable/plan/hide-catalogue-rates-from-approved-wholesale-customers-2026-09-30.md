# Hide catalogue rates from approved wholesale customers

## What will change
- Add one shared catalogue-rate visibility check that combines the approved trade-account state with the existing cached `account-staff-session` result. Only an approved non-staff trade customer will enter rate-on-request mode; signed-out visitors, retail customers, and staff keep normal prices.
- Add a translated “Rate on request” catalogue label in English, Bengali, and Hindi.
- Update product cards everywhere they are reused to replace the selling price with that label and suppress MRP and discount badges for approved non-staff trade customers. Staff catalogue and customer-detail cards will retain prices.
- Apply the same rule to product detail pricing, MRP, and percentage discount, while leaving its loader, metadata, and JSON-LD price unchanged.
- Remove prices from search suggestions for the same wholesale audience.
- On the bulk order pad, hide the entire price column and omit the total amount for approved trade customers; keep quantities, availability, and quote submission intact. Retail and signed-out visitors retain the current price column and total.

## Boundaries
- Do not change scooters, cart, checkout, customer orders, tracking, invoices, existing quote records, or the retail purchase journey.
- Do not add quote buttons or change the existing quote workflow.
- Do not alter product structured data or public search-engine pricing.

## Technical details
- Reuse React Query’s exact `account-staff-session` cache key and existing trade-account query rather than creating another identity endpoint.
- Keep the visibility decision in rendered catalogue UI so server-rendered public metadata remains unaffected.
- Add focused regression coverage for role-based price visibility, all three translations, product-detail structured-data preservation, and the bulk-pad table/total variants.

## Verification
- Run the focused tests, full test suite, and TypeScript checks, then confirm the preview build is clean.
- Browser-check approved trade, retail, signed-out, and staff views across catalogue cards, product detail, search suggestions, wishlist, and the bulk pad.
- Confirm Bengali and Hindi render translated labels, and signed-out product source still includes the unchanged INR structured price.
- Confirm past orders and priced quotes still display agreed amounts.
