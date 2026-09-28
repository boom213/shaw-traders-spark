# Improve product photo quality without slowing lists

## Goal
Keep product lists and invoices fast while restoring visibly sharper product photos. Use the selected adaptive two-size approach rather than returning to full-size originals.

## Changes
1. **Create two compact image sizes**
   - Keep a 192px variant for genuinely small placements: Counter Sales rows, compact manager tables, cart rows, and invoice thumbnails.
   - Add a 480px variant for visual product cards: Shop, category pages, homepage products, offers, wishlist/saved/recent products, related products, scooter cards, and other card-sized catalogue lists.
   - Keep original images on product-detail galleries and editing/detail views.

2. **Improve generated thumbnail quality**
   - Replace the current coarse nearest-neighbour server resize with smoother resampling so edges, labels, and product details remain clear.
   - Generate new uploads in both sizes with an appropriate WebP quality level for each use.
   - Preserve fallbacks so missing or unsupported thumbnails still display the original instead of a broken image.

3. **Avoid stale low-quality cached images**
   - Give the new variants distinct, versioned paths so browsers and the published-site cache do not reuse existing 192px files.
   - Generate variants on demand for existing catalogue photos and save them for subsequent requests.
   - Continue immutable long-term caching because uploaded photo filenames are unique.

4. **Apply each size by display context**
   - Route shared product cards and large scooter/list tiles to 480px images.
   - Route compact rows, search suggestions, manager lists, Counter Sales, cart lines, and staff invoice PDFs to 192px images.
   - Do not alter layout, product data, ordering, or full-size detail photos.

## Verification
- Confirm Shop, homepage, categories, offers, account product lists, related products, scooters, manager lists, Counter Sales, cart, and PDFs request the intended variant.
- Compare card image sharpness at desktop and mobile sizes while confirming list pages no longer fetch originals.
- Confirm product-detail pages still request full-size originals.
- Test existing photos, newly uploaded photos, missing-photo fallbacks, and PDF generation.
- Run focused image/PDF tests and check the preview build and image responses.

## Technical details
- Extend the product-photo URL/path helpers to encode variant and cache version deterministically.
- Update the public photo handler and server image helper to validate, create, store, and return both allowed variants.
- Keep image generation compatible with the existing server runtime and storage setup; add no new image service.
