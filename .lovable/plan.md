# Add the Online Sales staff role

## Goal
Create an **Online Sales** role that can work only with retail online orders. Existing Staff, Manager, Owner, and Super Admin access must remain unchanged.

## Implementation
1. **Add and rank the role safely**
   - Add `online_sales` to the existing staff-role enum in a standalone migration.
   - In a second migration, update the staff-role resolver so multi-role accounts still resolve to their highest privilege.

2. **Introduce an online-orders permission**
   - Add the role label, rank, and `online-orders` capability to the shared permission model.
   - Assign the Online Orders list and detail pages to this capability.
   - Keep all other sections and existing capability minimums unchanged.

3. **Enforce order-only access on the server**
   - Require `online-orders` for online-order listing, detail, counts, status, tracking, GST, request decisions, refunds, payment-review resolution, and staff invoices.
   - Keep Counter Sales, customers, enquiries, reviews, bookings, catalogue, trade, vendors, suppliers, settings, staff administration, and exports on their current permissions.
   - Preserve the existing exclusion of Counter Sales from online-order reads.

4. **Make navigation safe and focused**
   - Show Online Sales users only the Orders navigation item.
   - Redirect denied sections back to Online Orders rather than into a redirect loop.
   - Send Online Sales users directly to Online Orders after sign-in.

5. **Extend Staff Access controls**
   - Allow Super Admins to invite, filter, identify, and change eligible lower-tier accounts to Online Sales.
   - Show “Online orders” in the permissions drawer and retain the existing protected-account rules.

6. **Verify permissions and regressions**
   - Add permission and staff-role tests, including multi-role priority.
   - Verify Online Sales can complete online-order actions and invoice downloads.
   - Verify all non-order manager pages and server functions reject the role.
   - Confirm existing roles retain their prior access and owner-tier exports remain blocked.

## Technical notes
- The enum extension and resolver update are separate migrations because PostgreSQL cannot safely use a newly added enum value in the same migration transaction.
- Server functions remain the security boundary; hiding navigation is only a matching interface change.
