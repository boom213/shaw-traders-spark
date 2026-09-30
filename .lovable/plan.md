# Show Shop navigation to everyone

## Goal
Keep the **Shop** link visible for guests, customers, trade accounts, Staff, Sales Managers, Managers, Owners, and Super Admins.

## Changes
- Make **Shop** permanently visible in the desktop top navigation and mobile side menu.
- Make **Shop** permanently visible in the mobile bottom navigation, adjusting its column layout accordingly.
- Keep other customer-only shortcuts hidden from staff: cart, wishlist, category strip, account Shopping section, offers, scooters, and customer order links.
- Keep `/shop` and the rest of the storefront publicly browsable.
- Preserve the existing retail-only purchase and checkout restrictions, including server-side order authorization.
- Update focused navigation tests and the roadmap to reflect this precise visibility rule.

## Verification
- Confirm Shop appears for both staff/admin and non-staff states in desktop and mobile navigation.
- Confirm other customer-shopping shortcuts remain hidden for staff.
- Confirm staff can browse `/shop` but cannot complete retail checkout.
- Run focused access tests, type validation, and verify the preview build.
