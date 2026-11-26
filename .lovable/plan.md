# Keep the site up when shop settings can't be read

If the database is slow or asleep, every page will still open, using the standard shop settings, and the real ones load again straight away. This stops the whole-site crash seen on 21–23 Nov.

## Changes (exactly as in your brief)
1. `src/lib/shop-settings.ts`
   - Add optional `loadFailed?: boolean` to `ShopSettings`.
   - Replace `loadSettingsWithRetry` with `loadSettings()` (try once, log, return `{ data: null, failed: true }` on error).
   - `shopSettingsQuery`: `staleTime` becomes 0 when `loadFailed`, else 30 s; queryFn returns `{ ...DEFAULT_SETTINGS, loadFailed: true }` on failure. Rest unchanged.
2. `src/lib/shop-settings.functions.ts`: add `.abortSignal(AbortSignal.timeout(4_000))` before `.maybeSingle()`; keep the throw.
3. `src/lib/queries.ts`: `categoriesQuery` staleTime 5 min only when the list has items, else 0.
4. Add `tests/shop-settings-fallback.test.ts` and `tests/categories-fallback.test.ts` verbatim from the brief.
5. Add the one-line rule to `AGENTS.md`.

No new packages, no database changes; `__root.tsx` and `index.tsx` loaders untouched.

## Checks
- Run the two new test files plus the existing suite.
- Load `/`, `/shop` and a product page in the preview; confirm header, footer, GST line and Add to cart look as before, with no extra settings/category calls after load.
