# Fix stuck client-side product navigation

## Root cause
- Remove Shop’s direct `window.history.replaceState` call from the router’s `onBeforeNavigate` event. It rewrites browser history while TanStack Router is committing the product transition, leaving the URL updated but the old Shop route rendered.
- Keep the intended vehicle-filter cleanup by clearing the saved vehicle only; do not mutate the route being left because its search values are already absent from the destination product URL.

## Error visibility
- Add a router-level default error screen and `defaultOnCatch` logger so route render failures outside a route-specific boundary are visible and reported.
- Reuse the existing browser error reporting endpoint and Lovable preview reporting.
- Improve the product route’s own error boundary to report failures and show recovery actions instead of only printing the raw message.

## Preloading
- Keep intent preloading, but set router preload stale time to zero so TanStack Query remains the single cache/freshness owner and click navigation does not depend on a separate router freshness window.

## Verification
- Re-run the exact `/shop` → product-card transition and confirm the product page replaces the grid.
- Verify direct product loading still works, navigation failures report visibly, type checks pass, and the preview build is clean.
