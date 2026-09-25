# Read-only All Products page

## Goal
Add an **All Products** button in the Manage section that opens a dedicated, read-only product directory for every staff role.

## What will change
- Add **All Products** to the desktop manager navigation and mobile manager menu.
- Create a dedicated management page that displays all products without edit, save, upload, add, or delete controls.
- Show full product details: photo, name, SKU, category, brand, price, MRP, stock, low-stock threshold, visibility, and shelf location.
- Add search across product name, SKU, brand, model, and shelf location.
- Add category and visibility filters so large catalogues remain easy to browse.
- Add true paginated results with 10, 20, 50, and 100 rows per page, accurate totals, Previous/Next controls, and automatic reset to page one after search or filter changes.
- Make the page available to Staff, Manager, Owner, and Super Admin while preserving the existing role gate for the editable Products & Stock page.
- Add unique no-index page metadata consistent with the rest of the manager section.

## Technical details
- Reuse the existing protected catalogue list operation and its server-side pagination rather than loading the full catalogue in the browser.
- Register the new route under the existing `operations` capability so all staff roles can access it.
- Keep current Products & Stock behavior unchanged; the new page is a separate view-only surface.
- Verify search, filters, page sizes, page navigation, access for a Staff account, and desktop/mobile layouts.
