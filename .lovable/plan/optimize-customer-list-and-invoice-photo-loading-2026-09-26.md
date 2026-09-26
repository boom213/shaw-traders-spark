# Optimize customer list and invoice photo loading

## Customer list
- Add an index on `addresses.profile_id`.
- replace `manage_customer_page` so it counts matching profiles separately, selects only the requested page, then loads address and order summaries for those eight profiles.
- Preserve the existing search fields, ordering, return shape, and server-only execution permissions.

## Staff invoices
- Add a five-second abort timeout to external product-photo requests.
- Preserve the existing per-photo fallback behavior, including current catalogue photos and “No photo”.

## Verification
- Run the focused invoice tests and TypeScript checks.
- Confirm the preview build remains clean.

## Technical details
- Apply the database change as an additive migration; no tables or columns are removed.
- The paged query keeps total-count reporting while preventing address and order aggregation across every matching customer.
