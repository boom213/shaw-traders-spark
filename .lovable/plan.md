# Reorganize manager sidebar navigation

## Changes
- Keep **Overview** as the standalone first link without a group heading.
- Reassign the remaining existing links into this sidebar order:
  1. **Sales:** Orders, Counter Sales, Vendor Payments, Enquiries
  2. **Catalog:** All Products, Products & Stock, CSV Price List, Vehicle Catalogue
  3. **Customers:** Customers, Trade & Credit, Reviews, Bookings & Service
  4. **Analytics:** Reports, Payment Reports
  5. **Settings:** Domain Health, Site Settings, Staff Access
- Preserve every link's existing destination, icon, matching behavior, and permission requirement.
- Leave the sidebar styling, collapsed icon rail, tooltips, saved collapse preference, mobile menu, and all manager pages unchanged.

## Technical details
- Update only the navigation metadata and grouping render order in the shared manager layout.
- Treat Overview as the sole unheaded item while keeping its current active-link behavior.
- Verify expanded, collapsed, and mobile navigation ordering, plus role-based visibility.
