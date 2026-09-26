# Scale manager lists and overview queries

## Scope

Apply the uploaded performance brief only to the manager panel. Keep the storefront, existing product pagination, and manager workflows unchanged.

## Changes

1. **Standardize manager paging at 8 records**
   - Reuse the existing server-side `count + range` pattern and a shared 8-row page size with Previous/Next and numbered page controls.
   - Change `/manage/customers` from 25 to 8 rows while preserving search, totals, links, and refresh-on-focus behavior.
   - Split each customer detail into a lightweight account/address read plus an independently paginated 8-order history. Keep lifetime value and previously purchased products complete through database aggregates rather than deriving them from only the visible order page.
   - Paginate trade applications, recent counter sales, vendor payment history, reviews, enquiries, and the four vehicle request queues (finance, exchange, service, and test rides), resetting to page one whenever a filter or search changes.
   - Return `{ items, total }` from each list function and fetch related details only for the eight records on the active page.

2. **Make counter-sale customer loading on demand**
   - Stop loading every wholesale profile, address, and ledger row during Counter Sales setup.
   - Keep setup limited to GST settings and active vendor QR choices.
   - Add a searchable, server-paged wholesale customer selector capped at 8 results.
   - Fetch the selected customer's pricing tier, default address, outstanding balance, overdue state, credit limit, and terms in one dedicated call when selected.
   - Preserve product search, sale creation, payment recording, vendor linking, invoices, and the current Counter Sales layout.

3. **Separate vendor summaries from paged history**
   - Compute each vendor's all-time and current-month totals in the database so summary cards remain complete.
   - Fetch only the active 8-row payment-history page for display, without affecting QR management or standalone payment recording.

4. **Move overview calculations into the database**
   - Keep the existing database-backed customer statistics work.
   - Replace the remaining 2,000–3,000-row dashboard and attention queries with protected database aggregate functions for daily/weekly/monthly sales, pending orders, best sellers, low-stock items, missing photos/prices, and attention counts.
   - Continue returning only the small displayed lists, such as six best sellers, twenty low-stock products, five recent errors, and twelve missed searches.

5. **Constrain growing manager panels**
   - Audit custom manager dropdowns, search-result lists, line-item panels, and history panels; add a screen-safe maximum height and vertical scrolling where content can grow.
   - Leave native selects alone because they already scroll, and do not alter storefront layouts.

## Technical details

- Add service-role-only, security-definer database functions where an aggregate or joined page is needed; revoke public/browser execution and keep current staff authorization in the calling server functions.
- Keep all new manager queries on the shared manager freshness setting.
- Preserve newest-first ordering for applications, payments, enquiries, reviews, sales, and vehicle requests.
- Keep page state local to each independent section so changing one list does not reset another.

## Verification

- Confirm every scoped list displays at most 8 records, shows accurate totals/page controls, and resets paging after search or filter changes.
- Confirm customer lifetime totals, vendor totals, dashboard numbers, and attention counts remain complete beyond the visible page.
- Verify Counter Sales loads without bulk profile/address/ledger reads and fetches customer details only after selection.
- Test empty, loading, mutation-refresh, and last-page states; verify manager pages on desktop and mobile.
- Run focused tests and type checks, inspect the latest build result, and browser-test the main manager flows with an authenticated manager session.
