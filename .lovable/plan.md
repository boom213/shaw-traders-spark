# Separate retail online orders from wholesale counter sales

## What will change
- Replace the existing `manage_order_page` database function without changing its signature, search behavior, filters, pagination, or permissions.
- Exclude any order linked by `counter_sales.order_id` inside the shared matching set, so both returned rows and `total_count` contain online retail orders only.
- Keep all counter-sale records in `orders`; no rows, accounting records, GST data, prices, invoices, or ledgers will be moved or deleted.
- Label the navigation tabs **Online Orders · Retail** and **Counter Sales · Wholesale**.
- Show the active page’s existing total beside its tab; do not fetch a count for the inactive tab.
- Add the requested one-line context under each page title and a clearer empty state on Online Orders with a link to wholesale counter sales when the signed-in role can access them.

## What stays unchanged
- Counter Sales listing, creation, payments, invoices, stock handling, and credit ledger.
- Customer account order history.
- Existing manager access rules and the separate page URLs.

## Technical details
- Apply one additive function-replacement migration using the authoritative `counter_sales` relationship and reapply the existing revoke/grant rules.
- Pass optional totals into the shared link-based tab component from each page’s existing paginated response.
- Preserve the current page size and compose the new exclusion with the existing search, status, and payment-status predicates.

## Verification
- Confirm the known `CS-260928-6592` sale is absent from Online Orders and remains present in Counter Sales.
- Confirm Online Orders drops from 28 mixed records to 13 retail records while all 15 counter sales remain available.
- Confirm displayed totals match paginated rows and filters/search still compose correctly.
- Confirm tab labels, active counts, subtitles, and empty states on desktop and mobile.
- Run focused tests and confirm the app builds cleanly.
