# Split Online Orders into a compact list and detail page

## What will change
- Turn `/manage/orders` into a scannable order index:
  - Keep the existing Retail/Wholesale tabs, search, status filter, payment filter, empty state, and pagination.
  - Add From/To date controls that combine with every existing filter and reset pagination when changed.
  - Show two concise summary cards: new online orders and today’s counter sales. The Counter Sales card remains hidden for Staff who cannot open that page.
  - Use a compact desktop table with order, customer, date/time, item count/value, amount, payment, status, and actions.
  - Use tappable stacked order cards below the medium breakpoint.
  - Keep View as the primary action; place Packing slip, WhatsApp, and Download invoice in the overflow menu.
- Add `/manage/orders/$orderId` inside the existing Manager panel shell:
  - Show a back link, order/customer/payment overview, address, item and financial summaries.
  - Move the existing status, packing slip, WhatsApp, customer/staff invoice, tracking, refund, request decision, payment-review, delivery-pin, and public-order-page actions here without changing their behavior.
  - Show a clear not-found state when the order ID is invalid.

## Data and permissions
- Replace `manage_order_page` with the same filtering and counter-sale exclusion, adding optional trailing From/To date parameters. The To date includes the entire selected day.
- Add `manage_order_counts()` for confirmed online orders and counter sales created today in Asia/Kolkata; keep it staff-only through the server function and database grants.
- Extend `manageOrders` with the date inputs, add `manageOrder({ orderId })`, and add `manageOrderCounts()`.
- Reuse one shared order selection and mapper for both list and detail reads. Extend the mapped order only with existing financial fields needed by the detail summary: subtotal, discount, shipping fee, and tax.
- Explicitly map `/manage/orders/*` to the existing Operations capability. No other permission changes.

## Reuse and safeguards
- Extract the current packing-slip, WhatsApp, PDF-download, and order action UI into shared Manager-order modules so list and detail pages do not duplicate logic.
- Preserve `setOrderStatus`, tracking, refunds, invoice generation, order-request decisions, payment-review resolution, GST/pricing, and customer order history unchanged.
- Do not alter Counter Sales creation, listing, payments, invoices, or existing rows. Online Orders will continue to exclude every row linked through `counter_sales.order_id`.
- Use existing controls, tokens, loaders, and page-size behavior; add no dependency.

## Verification
- Confirm search, order status, payment status, From/To dates, and pagination work separately and together.
- Confirm the list contains only online retail orders and the displayed range/total matches returned rows.
- Confirm the summary cards match database values, including Asia/Kolkata day boundaries and role-aware Counter Sales visibility.
- Confirm View opens the correct detail URL and browser back returns to the list.
- Exercise all moved actions: status updates, packing slip, WhatsApp, both invoices, tracking/ship, refund, request approval/rejection, payment-review resolution, delivery pin, and public order link.
- Check compact desktop table and mobile cards, then run focused order/permission tests and confirm a clean build.
