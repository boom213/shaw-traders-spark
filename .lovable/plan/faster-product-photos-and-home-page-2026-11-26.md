# Faster product photos and home page

What shoppers will notice: product photos on Shop and Home load from a nearby Cloudflare server after the first visit, small photos are never bigger than the full photo, and the home page waits for the database at most once a minute per region.

## Changes (exactly as in the brief)

1. New `src/lib/edge-cache.ts` with `edgeCache`, `edgeCachedResponse`, `edgeCachedJson`. Falls back to current behaviour when the Cloudflare cache is missing or refuses (preview, tests).
2. `src/lib/catalog.functions.ts`: `homeFeed` wraps `loadHomeFeed` in `edgeCachedJson("home-feed-v1", 60s)` inside the existing 30s memory cache; empty feeds never kept.
3. `src/routes/api/public/photo/$.ts`: old handler body moved into `servePhoto`; product photos wrapped in `edgeCachedResponse`; review photos not edge-cached. Same URLs, headers, privacy.
4. `src/lib/product-thumbnail.server.ts`: replace `loadOrCreateProductThumbnail` so a thumbnail is never stored/served bigger than its original; old PNG thumbnails over 60 KB are swapped once for the smaller original (size checked via storage info first).
5. Add `tests/edge-caching.test.ts` from the brief.
6. Add the brief's rule line to AGENTS.md.

No new packages, no database changes, `ttl-cache.ts` untouched.

## Trade-off
Staff edits to the home page show within about 90 seconds instead of 30. Prices, stock, checkout and staff screens are unaffected.

## Verification
Run the new test file plus existing ttl-cache/thumbnail tests, check the build, and open Home and Shop in the preview to confirm photos still show. Edge caching itself only works on the live site after publishing.
