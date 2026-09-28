# Faster product photos across all product lists

## Goal
Use the existing compact 192px product-photo system everywhere products appear in a list, while keeping original high-resolution photos on the product detail page and in its zoomable gallery.

## Implementation
- Update the shared product card to request the compact thumbnail URL. This covers Shop results, category pages, homepage product rows, offers, wishlist/saved/recently viewed lists, cart recommendations, customer product lists, and related-product rows.
- Update remaining direct product-list images, including cart lines and staff catalogue/all-products rows, to use the same thumbnail helper.
- Keep Counter Sales and staff PDFs on their existing compact-photo path.
- Leave the main product detail image, gallery thumbnails, zoom view, metadata/social image, and stored original photo URLs unchanged.
- Preserve placeholders and external/demo image behavior; only privately stored product photos are rewritten to compact variants.
- Keep explicit image dimensions, lazy loading, and asynchronous decoding on list images so layouts stay stable and off-screen photos do not delay the page.

## Existing-photo behavior
- Existing catalogue photos will create and cache their compact variant the first time the thumbnail URL is requested.
- Future uploads will continue creating the compact variant during upload.
- If compact conversion is unsupported or fails, the existing original-photo fallback remains available.

## Verification
- Add coverage proving list-photo selection uses compact URLs while detail photos remain original.
- Check Shop on desktop and mobile, including initial load, filtering/pagination, image rendering, and opening a product detail page.
- Check representative homepage, category, offers, cart, and staff product lists for working thumbnails and stable layouts.
- Confirm focused tests and the preview build pass without changing catalogue, pricing, stock, search, or ordering behavior.
