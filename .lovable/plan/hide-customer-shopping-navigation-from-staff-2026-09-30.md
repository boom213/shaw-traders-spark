# Hide customer shopping navigation from staff

## What will change
- Reuse the existing shared staff-session lookup in the main header and mobile tab bar.
- Hide only customer-shopping entry points from staff: Shop, product categories, wishlist, and cart.
- Keep Home, Account, Trade, Bulk Orders, Service, Track, About, Contact, WhatsApp, language, and search unchanged.
- Make the mobile tab layout match the resulting number of visible tabs.

## Verification
- Add focused checks covering staff and customer navigation visibility.
- Confirm the existing customer-only page protection remains unchanged.
- Run focused tests and check the preview build.
