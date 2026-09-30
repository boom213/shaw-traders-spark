# Hide customer account shopping content from staff

## What will change
- Keep Profile & details visible in the account menu for every signed-in account.
- Hide My orders, Wishlist, and Track an order from the account menu when the verified session belongs to staff.
- Reuse the existing shared staff-session query on `/account`.
- Hide the Orders, Wishlist, and Saved from your cart sections for staff while preserving profile, password, addresses, bookings, sign-out, and direct `/track` access.
- Prevent staff from starting the customer-order request and exclude wishlist/saved product IDs from the shared product lookup.

## Verification
- Add focused checks for dropdown visibility, account section visibility, and staff query suppression.
- Confirm `/track` remains unguarded and existing header, mobile tabs, and customer shopping route protection are unchanged.
- Run the focused tests and check the preview build.
