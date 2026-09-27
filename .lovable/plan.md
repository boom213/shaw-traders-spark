# Fix storefront product search

## Goal
Make common catalogue searches return the same visible parts shoppers can browse, without relying on the deprecated `is_active` flag.

## Confirmed findings
- The deployed `search_product_ids` function still filters on `products.is_active`.
- Storefront product listings use `status = 'visible'` and `product_kind = 'part'` instead.
- The current database has no rows where `is_active` disagrees with `status`, but the deprecated filter remains a future drift risk.
- “Battery” currently returns three matching products; “motor” returns none because no visible part has “motor” in its currently scored fields.
- Pressing Enter in the homepage search reliably navigates to `/shop?q=<term>`, even when no suggestion menu is open.

## Implementation
1. Add and apply one database migration that:
   - Replaces the function’s `WHERE p.is_active` condition with `p.status = 'visible' AND p.product_kind = 'part'`.
   - Extends relevance scoring to category name and slug, so category terms such as “motor” can find parts assigned to that category.
   - Preserves typo tolerance, compatibility matching, score ordering, limits, security settings, and execute permissions.
   - Backfills `is_active` from `status` once for compatibility with any remaining legacy reads.
2. Keep the current homepage form submission code unless regression testing exposes a failure; its Enter path is already working in the preview.
3. Add focused regression coverage for visibility filtering, category-term matching, and Enter-to-search navigation where supported by the existing test structure.

## Verification
- Query the updated function directly for “motor” and “battery” and confirm only visible parts are returned.
- Test the header/homepage live-suggestion dropdown for both terms.
- Press Enter with the suggestion dropdown closed and confirm `/shop?q=motor` and `/shop?q=battery` load real product results.
- Confirm hidden products and scooter records never appear in either search path.
- Check the preview build and relevant automated tests.
