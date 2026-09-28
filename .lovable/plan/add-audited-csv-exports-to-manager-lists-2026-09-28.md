# Add audited CSV exports to manager lists

## Goal
Add an **Export CSV** action to the requested manager list views. Each export uses the page’s active filters, includes all matching rows rather than only the visible page, is limited to Owners and Super Admins through the existing Reports permission, and records an audit entry.

## Shared export foundation
- Add one CSV utility for safe cell escaping and CRLF output with a UTF-8 BOM, so Excel preserves Hindi text and currency characters.
- Add one reusable **Export CSV** button using the existing outline button, download icon, loading indicator, browser Blob download pattern, and success/error toasts.
- Standardize export results as `{ csv, fileName, rows, truncated }` so the shared button can report the actual row count and warn when only the first 10,000 rows were exported.
- Add shared server-side helpers for:
  - Asia/Kolkata date/time formatting.
  - Dated filenames in `<dataset>-<YYYY-MM-DD>.csv` form.
  - Bounded paging in chunks of 1,000 up to 10,000 rows.
  - Reports-permission authorization and `export.<dataset>` audit entries containing the exported row count and active filters.
- Replace duplicate CSV escaping/building in catalogue, supplier ledger, and payment reports with the shared utility. Keep the existing payment-report and supplier-ledger columns, filters, and PDF behavior unchanged.

## Export functions and page controls
Add a matching server export beside each existing list function, without changing ordinary list queries, page sizes, filters, or edit permissions. Render the shared button inline with each page’s filters only when the signed-in role has Reports permission.

- **Online Orders:** apply search, order status, payment status, From, and To; export order number, Kolkata date/time, customer and phone, item names, total quantity, subtotal, discount, shipping, tax, total, payment method/status, order status, courier, tracking, and refunded amount. Continue excluding counter sales.
- **Counter Sales:** apply the current invoice/customer search; export invoice number, Kolkata date/time, customer, phone, invoice kind, items, total, tax, paid, balance, due date, creator, and cancelled state.
- **Customers:** apply current search; export name, phone, email, type, price tier, total spend, order count, and last order. Obtain order count only inside the export query so the existing list payload stays unchanged.
- **Suppliers:** add a filtered supplier-summary export for the Suppliers tab; migrate the existing filtered ledger CSV action to the shared button and bounded export helper.
- **Vendors:** export the transaction history already represented by the page’s QR collection and payout data, with date, vendor, direction, amount, reference, note, and recorder. Keep collections and payouts explicitly labelled and non-overlapping.
- **Enquiries:** apply current status; export date, product, customer, phone, quantity, vehicle, note, status, and handler.
- **Bookings:** apply current booking status; export booking number, date, model, customer, phone, on-road total, token paid, balance due, status, payment status, expected delivery, chassis, motor, and registration.
- **Trade & Credit:** add separate exports for the active application-status view and the paged outstanding report, using the requested columns for each dataset.
- **All Products and Products & Stock:** preserve each page’s independent search/category/status or issue filters; export SKU, name, brand, category, MRP, price, stock, status, HSN, and rack location. Reuse one product row formatter while retaining each page’s filter semantics.
- **Reviews:** apply current status; export date, product, rating, customer, title, body, status, and staff reply.
- **Staff Access — Recent changes:** apply audit search, activity group, and date range; export date, action, entity, actor name, actor email, and role. Do not export staff credentials, invitation passwords, tokens, secrets, or audit diff payloads.
- **Payment Reports:** replace the custom CSV control with the shared button and CSV utility while preserving the current date range, report sections, columns, and PDF action.

## Data access and safeguards
- Every new export independently enforces `requireStaff({ capability: "reports" })`; hiding the button is not the security boundary.
- Export readers reuse the same validation and filtering semantics as their page list, but ignore page/page-size inputs.
- Fetch in deterministic 1,000-row chunks, stop at 10,000, and check whether another matching row exists to set `truncated` accurately.
- Use plain numeric values for money and quantities, and format timestamps as `YYYY-MM-DD HH:mm` in Asia/Kolkata.
- Add only narrowly scoped database report functions where existing list RPCs cannot safely supply the requested export shape or 1,000-row paging. Preserve current grants and staff-only access.
- Keep existing list behavior and page permissions unchanged; no spreadsheet package or new runtime dependency.

## Verification
- For every requested view, apply each available filter and confirm the CSV row count equals the filtered total rather than the visible page.
- Confirm combined order filters and date boundaries, counter-sale exclusion from online orders, both supplier tabs, both trade datasets, and both catalogue filter models.
- Open representative files in a spreadsheet-compatible parser and verify UTF-8/BOM, commas, quotes, line breaks, Hindi text, dates, and numeric money fields.
- Confirm an ordinary Staff or Manager sees no export action and cannot call an export directly; Owner and Super Admin can export.
- Confirm every successful export creates the expected audit-log entry, including zero-row and truncated exports.
- Test the 10,000-row cap/warning and failure toast, then run focused permission/export tests, relevant existing tests, and verify a clean preview build.
