# Hide Find Parts from the public storefront

## Outcome
Public visitors will no longer see or discover “Find Parts for Your EV.” The existing finder remains available only to signed-in staff through its direct URL.

## Changes
1. Remove Find Parts from the desktop header, mobile menu, mobile bottom bar, and footer.
2. Remove the Find Parts section and its data-loading import from the homepage.
3. Remove `/find-parts` from the XML sitemap and site-navigation structured data.
4. Mark the route as non-indexable and return a normal not-found view to visitors without a staff session; retain the full existing finder for signed-in staff.
5. Keep product browsing, categories, search, and all manager tools unchanged.

## Verification
- Check desktop and mobile storefront navigation, footer, and homepage for the removed entry.
- Confirm a signed-out visit to `/find-parts` does not reveal the feature and is excluded from search indexing.
- Confirm a signed-in staff member can still open `/find-parts` directly and use the existing finder.
- Run focused type checks and confirm a clean preview build.
