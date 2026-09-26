# Customer list and dedicated details page

## Goal
Keep `/manage/customers` as a clean customer directory and use the existing customer-specific page for the complete account record.

## Changes
- Remove the **Orders** column and its order-number chips from the customer list.
- Turn each customer name into a clearly underlined link to `/manage/customers/{customerId}`.
- Remove the redundant **View** button because the customer name becomes the primary way to open details.
- Keep phone, account type, total value, last order, Call, and WhatsApp actions in the list.
- Keep the dedicated customer page as the full record, including account and pricing, saved addresses, order history with line items and order links, previously purchased products, and the product catalogue.
- Preserve current permissions: authorized staff can view; only Super Admin can edit customer account terms and addresses.

## Verification
- Confirm the customer list has no Orders column and the table remains aligned on desktop and mobile overflow.
- Confirm every underlined customer-name link opens the correct dedicated customer page.
- Confirm order history and related details remain available on that page, with existing role restrictions unchanged.
- Run type checks and verify the latest preview build is clean.
