# SEO fixes for Google (from your brief)

Nothing visitors see changes. No pages removed, no menu changes, no database changes, no new packages.

## What changes
1. **Empty categories hidden from Google only** — Controllers, Motors, BMS, EV Batteries, Display & Meter get a "noindex" tag and leave the sitemap. Pages, WhatsApp and call buttons stay. They come back automatically once a part is listed.
2. **Sign-in page (/account)** — noindex, removed from the sitemap.
3. **Product titles** — stop repeating the shop name ("12 No. Bolt for EV Scooter / E-Bike — Shaw Traders EV"). Other brands like "Ola" stay in front.
4. **Bulk page title** — "Dealer & Bulk Orders — Shaw Traders EV".

## Technical details
- New `src/lib/seo.ts` with `productHeading` and `listedCategorySlugs` (exact code from brief).
- `product.$slug.tsx`: title/fallback description use `productHeading`; JSON-LD, H1, brand label untouched.
- `category.$slug.tsx`: loader returns `listed: products.total > 0`; head adds robots noindex when not listed.
- `account.tsx`: robots noindex; `bulk.tsx`: title.
- `sitemap[.]xml.ts`: apply brief diff (drop /account, product query adds `categories(slug)`, splice only listed categories in place).
- Add `tests/seo-fixes.test.ts` (6 tests) and one AGENTS.md rule.
- Verify: run the new and existing tests, check build log, check sitemap and category/product page source in preview.

## After publishing
Check sitemap.xml and resubmit it in Google Search Console.
