# Super-admin customer management and product ordering

## Goal
Turn **Customers** into a complete customer directory with a dedicated detail page. All staff who already have customer access can view it, but only a **Super Admin** can change customer account settings. Name, email, and phone remain read-only.

## Changes

### Customer directory
- Rework `/manage/customers` to list registered customer profiles, including customers who have not ordered yet.
- Keep search across name, email, phone, and location.
- Show account type, price tier, order count, lifetime spend, and latest-order date.
- Add a clear **View customer** action linking to `/manage/customers/{customerId}`.
- Preserve existing call and WhatsApp actions when a phone number exists.

### Dedicated customer page
- Add `/manage/customers/{customerId}` with:
  - Read-only name, email, and phone.
  - Account type and pricing tier.
  - Credit limit and payment-term days.
  - Saved delivery addresses, including default-address selection.
  - Order history with purchased line items and links to existing order views.
- Allow all staff with customer access to view the page.
- Show editing controls only to Super Admins; reject every save on the server unless the signed-in staff member is a Super Admin.
- Validate allowed tiers, non-negative credit, sensible payment terms, and complete address fields.
- Record customer/account and address changes in the audit log.

### Products and Add to Cart
- Add a **Previously purchased** section showing products from the customer’s order history.
- Add a searchable **Product catalogue** section showing currently available products.
- Each product links to the existing full product-details page.
- Provide Add to Cart from both sections, using the existing stock checks, price-tier handling, and cart experience.
- Clearly explain that products are added to the currently signed-in browser’s cart; this does not silently alter the customer’s personal cart.

### Access and navigation
- Register the dynamic customer route under the existing customer-management permission so unauthorized users are redirected by the manager guard.
- Keep the customer list available to existing operations staff while reserving edits for Super Admins.
- Add unique no-index management metadata for the customer detail page.

## Technical details
- Add the dynamic TanStack route as `manage.customers.$customerId.tsx` with route ID `/manage/customers/$customerId`.
- Extend the existing management server functions with customer-directory, customer-detail, Super-Admin-only update, and address mutation operations.
- Query profiles, addresses, orders, order items, and products through authenticated staff-only server functions; privileged writes verify the caller role before using elevated database access.
- Keep identity fields outside every update payload so they cannot be changed by tampering with the form request.
- Reuse the existing product card/cart store and dynamic product links rather than creating a second product-details implementation.

## Verification
- Test as Super Admin: open a customer, update account/pricing/credit/address fields, reload, and confirm the saved values.
- Confirm name, email, and phone cannot be edited.
- Test as Staff or Manager: customer details are viewable but edit controls are absent, and direct save attempts are rejected.
- Open a previously purchased product and a catalogue product, then add each to cart and verify quantities and stock behavior.
- Check empty-order, no-address, no-phone, mobile, and desktop states; confirm no console, network, or build errors.
