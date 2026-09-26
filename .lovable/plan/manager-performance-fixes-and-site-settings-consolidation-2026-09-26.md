# Manager performance fixes and Site Settings consolidation

## Goal
Fix the three confirmed data-scaling issues, then consolidate homepage banners, the About gallery, and the downloadable brand catalogue into one Owner-only Site Settings page without breaking old links.

## 1. Paginate the Orders manager page
- Change the order query to accept a page and search term, return `{ items, total }`, and fetch 8 orders at a time.
- Apply the search to the complete orders table before pagination, preserving order-number, customer-name, and phone matching.
- Add the shared manager pager below the order list, reset to page 1 for a new search, and retain the previous page while a refresh is in progress.
- Keep all existing order cards, fulfilment actions, invoices, customer contact, and status controls unchanged.

## 2. Replace the Trade Outstanding query fan-out
- Add one database reporting function that calculates trade-account balance, credit limit, oldest unsettled invoice due date, and overdue status in one aggregate query.
- Return only accounts with money owed, ordered by oldest due date, with a stable secondary order.
- Paginate this report at 8 accounts per page and return its total count.
- Update the “Money owed” table to use the shared pager and refresh the current page after a payment is recorded.
- Restrict the reporting function to trusted server access, matching the existing manager-summary functions.

## 3. Make vehicle and facet caps deterministic
- Add stable database ordering before every existing cap in `vehicleTree` and `listFacets`.
- Preserve the current public response shapes, brand/model grouping, filtering, and display order.
- Add focused checks proving repeated capped reads cannot arbitrarily change which source rows are selected.

## 4. Consolidate Site Settings
- Make `/manage/settings` an Owner/Super Admin-only tabbed page with:
  - General
  - Home Banners
  - About Gallery
  - Brand Catalogue
- Keep all current General settings and all existing banner, gallery, and PDF-upload behavior unchanged.
- Extract the three existing management screens into reusable manager-panel components rather than importing route modules into one another.
- Store the selected tab in the URL (`?tab=...`) so refreshes and copied links reopen the same tab.
- Remove Home Banners, About Gallery, and Brand Catalogue from desktop/mobile manager navigation and account shortcuts, leaving Site Settings as the single entry.
- Keep `/manage/home`, `/manage/about`, and `/manage/brand-catalogue` alive as redirects to their matching Site Settings tabs.
- Update route permissions so Managers no longer access these three tools; Owner and Super Admin retain access through Site Settings and redirected old links.

## Technical details
- Reuse the existing 8-row `ListPager` and manager query-refresh conventions.
- Add the aggregate report in the next database migration with explicit function revokes/grants and a fixed `search_path`.
- Keep generated route files untouched; redirects remain normal TanStack route files.
- Preserve existing semantic styles, Spark loading indicators, audit behavior, and upload logic.

## Verification
- Test order search against records outside the first page and verify paging totals/actions.
- Test the outstanding-report aggregate, ordering, total count, pagination, and refresh after recording a payment.
- Test deterministic vehicle/facet results at the configured caps.
- Verify each settings tab, direct `?tab=` links, old-route redirects, Owner/Super Admin access, and Manager denial.
- Check desktop and mobile manager navigation, TypeScript, targeted tests, the preview build, and the relevant browser flows.
