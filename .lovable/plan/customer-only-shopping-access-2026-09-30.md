# Customer-only shopping access

## Goal
Only signed-in customer accounts can see and open the Shopping section shown in the screenshot. Staff, Managers, Owners, Super Admins, Sales Managers, and signed-out visitors cannot access those shopping pages.

## Changes
- Add one reusable customer-page access guard that:
  - sends signed-out visitors to Sign In / Register;
  - identifies staff roles from trusted account data;
  - sends every staff role back to its permitted manager page;
  - allows signed-in non-staff customer accounts, including approved wholesale customers.
- Apply the guard to the complete linked shopping journey: All Products, EV Brands, Electric Scooters and scooter details, My Cart, Offers, product details, and category results. Keep the public homepage available.
- Hide the entire Shopping heading and its five links in the account menu unless the signed-in account has been confirmed as a non-staff customer. Avoid briefly showing it while account access is still loading.
- Preserve the requested shopping destination through Sign In / Register, then return an eligible customer there after successful sign-in. Validate the return destination against a fixed shopping-page allowlist.
- Keep existing retail purchase restrictions unchanged: wholesale customers may browse these customer pages but still cannot place retail online orders; staff retain their separate manager and Counter Sales workflows.

## Security details
- Enforce the restriction before protected pages render, not only by hiding menu links.
- Reuse server-verified staff-role checks; never trust browser storage or a client-supplied role.
- Keep checkout’s existing server-side retail eligibility checks unchanged.

## Verification
- Signed-out visitor: Shopping routes redirect to Sign In / Register and return to the intended page after customer sign-in.
- Retail and wholesale customer accounts: Shopping menu is visible and all protected shopping pages open.
- Sales Manager, Staff, Manager, Owner, and Super Admin accounts: Shopping menu is absent and direct URLs redirect to their permitted manager destination.
- Existing homepage, manager navigation, trade pages, Counter Sales, checkout eligibility, desktop/mobile menus, and browser refresh remain working.
- Run focused access tests, type validation, preview build, and authenticated browser checks for customer and staff states.