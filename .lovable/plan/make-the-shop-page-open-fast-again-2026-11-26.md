# Make the Shop page open fast again

The Shop page currently waits for the filter lists (brands, voltages, Ah) before it appears. Those are the slowest read (~1.5 s). After this change the products show straight away and the filter lists fill in a moment later.

## What changes
1. **Shop page** (`src/routes/shop.tsx`): the loader awaits only the first page of products; filter options load in the browser (the panel already uses plain `useQuery`, so nothing breaks).
2. **Filter options** (`src/lib/catalog.functions.ts`): `listFacets` is wrapped in the existing `createTtlCache` with a 10-minute lifetime; empty results are never kept. Query body unchanged.
3. **Tests** (`tests/shop-speed.test.ts`): filter options are read once then reused; the loader does not wait for filter options.
4. **AGENTS.md**: one rule recording this decision.

## Safe because
- Products stay in the page HTML (Google and shoppers see them immediately).
- Cache holds only public brand/voltage/Ah names, never prices or user data. A new brand may take up to 10 minutes to show in the filter list.
- Filtering and product results still query live data every time.

## After publishing
Refresh /shop a few times (should start in ~1 s), open filters, pick a brand and change page.
