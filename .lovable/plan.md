# Role-based regression test setup and navigation fixes

## Outcome
Create a realistic, clearly labeled test catalogue and test personas, then make storefront and manager navigation match each persona’s actual access.

## Build
- Add a reusable permission model for `staff`, `manager`, `owner`, and `super_admin`, with server-side checks for every manager data read and action.
- Replace the shared manager link list with role-filtered navigation and route-level protection. Unauthorized manager pages return users to the nearest allowed section with a clear message.
- Add a protected test-data setup on the staff sign-in page. It requires the existing manager setup password and a user-chosen test password, creates customer/trade/staff/manager/owner test accounts, and displays the test email list without exposing stored secrets.
- Populate representative categories, products, compatibility records, retail and wholesale customer states, applications, orders, enquiries, reviews, bookings, service records, and alerts. Label test records and make setup repeatable without duplicates.
- Fix storefront navigation: visible desktop links, desktop account dropdown, simplified mobile drawer and tabs, consistent account wording, removal of storefront scooter links, hidden empty category bands, and cleaner footer groups.
- Move the first-visit cookie notice above mobile navigation and below account/menu overlays.
- Make Find Parts load consistently by preloading its category and vehicle data through the route query cache.

## Role model
- **Customer:** account, own orders, saved items, tracking, trade application.
- **Approved wholesale customer:** customer access plus trade dashboard, bulk pad, tier pricing, credit and statements.
- **Staff:** overview, orders, enquiries, reviews, bookings/service, and customer support operations.
- **Manager:** staff access plus catalogue, stock, trade review, content, summaries, and audit activity.
- **Owner:** manager access plus pricing/credit controls, payments/GST, domain/integration status, and staff list.
- **Super admin:** all access plus staff invitations/removal and highest-risk controls.

## Verification
- Confirm repeatable data setup and all created roles.
- Test signed-out, retail, pending-trade, approved-trade, staff, manager, owner, and super-admin navigation.
- Confirm hidden links are also blocked server-side, not merely hidden.
- Check desktop and mobile navigation, account menus, cookie placement, Find Parts, route loading, and current diagnostics.

## Technical details
- Existing tables and auth are reused; no destructive schema change is planned.
- Test accounts are created only through a password-protected server action using privileged backend access after validation.
- Mock passwords are never committed to source, logged, or stored outside the authentication system.
