# Fix manager freshness, query scale, and offline cache staleness

## Scope

Implement only the three issues in the uploaded brief. Do not change image lazy-loading.

## Changes

1. **Refresh operational manager data when returning to the tab**
   - Keep the public storefront’s global focus behavior unchanged.
   - Enable refetch-on-focus for operational manager queries, including orders, trade applications/outstanding balances, customers, catalogue/stock, dashboard, and reports.
   - Centralize the manager-query setting so future manager screens use the same freshness rule consistently.

2. **Move customer paging and manager totals to the database**
   - Replace the customer directory’s fixed 1,000-profile / 5,000-order / 3,000-address downloads with a database query that searches, aggregates order count/value/latest order, and returns one page at a time.
   - Add page controls to `/manage/customers`, reset to page one when searching, and preserve the current customer columns and dedicated-detail links.
   - Replace the manager statistics function’s 2,000-row product/order downloads with database-side counts and totals so results remain complete as data grows.
   - Keep access restricted to authorized staff and preserve existing customer-detail behavior.

3. **Reduce stale offline content**
   - Reduce page navigation’s network fallback timeout from four seconds to two seconds.
   - Change public product/review photo caching from cache-first to stale-while-revalidate, retaining the existing cache limits.

## Verification

- Confirm manager queries opt into refresh-on-focus while public queries retain their existing behavior.
- Verify customer search, pagination, customer links, empty/loading states, and aggregate values.
- Verify manager totals no longer depend on fixed client-side row limits.
- Run focused tests and type checks, inspect the current build result, and verify the customer page in the browser.
