# Show whether product photos come from Cloudflare's edge cache

Product photo responses get one extra header, `X-Edge-Cache`, that says how the photo was served. Photos, prices and pages otherwise stay exactly the same.

## Changes
1. `src/lib/edge-cache.ts`: replace `edgeCachedResponse` with the brief's version, adding `EDGE_CACHE_HEADER` and a `withStatus` helper. The header is set on a copy of the response, so the stored copy never carries a status. `edgeCache`, `EdgeCache` and `edgeCachedJson` stay as they are.
2. Add `tests/edge-cache-header.test.ts` (5 tests from the brief).

## Header values
- HIT: served from the edge. MISS: built and stored. NOSTORE: not cacheable. ERROR: the edge refused to store it. OFF: no edge cache.

## Checks
- Run the new tests plus `tests/edge-caching.test.ts`, then confirm a photo from /shop in the preview loads with the header `OFF`.
- After publishing: open a photo URL twice. The header should say MISS the first time and HIT the second.
