# Faster product images in Counter Sales and staff PDFs

## Goal
Keep clear full-size catalogue photos for product pages while making the **Add products** results in Counter Sales and photo-enabled staff PDFs load substantially faster.

## Implementation
1. **Create a dedicated thumbnail variant on upload**
   - Keep the existing main WebP photo for product pages.
   - Generate a separate compact thumbnail for each newly uploaded product photo, sized for list rows and invoice cells rather than the current 1400px maximum.
   - Store it beside the original under a predictable derived path, so no extra product-image database column is needed.

2. **Optimize existing catalogue photos**
   - Generate the same compact thumbnail variant for existing product photos so current products benefit immediately, not only future uploads.
   - Preserve all original files and existing product-image links.
   - If an older or unusual image cannot be converted, leave it untouched and use the original as a fallback.

3. **Use thumbnails in the Counter Sales product picker**
   - Return the compact image URL from the Counter Sales product search used by the screenshot’s **2. Add products** section.
   - Keep product names, SKU, stock, shelf, wholesale pricing, search, and Add behavior unchanged.
   - Add fixed image dimensions, lazy loading, and asynchronous decoding so rows remain stable while images load.

4. **Use thumbnails in staff invoice PDFs**
   - Resolve the compact variant before downloading the original product photo.
   - Embed only the small invoice-sized image, avoiding full-resolution download and WebP decoding where a prepared thumbnail exists.
   - Preserve snapshot-first behavior, current catalogue-photo fallback, the five-second external fetch limit, and the visible “No photo” fallback.
   - Customer invoices remain unchanged because they do not include product photos.

5. **Safe compatibility and fallback**
   - Continue supporting older relative links, bundled demo JPEGs, absolute HTTPS links, data URLs, PNG/JPEG, and WebP.
   - Never block the product list or invoice when a thumbnail is missing or invalid; fall back to the current source and then “No photo.”

## Verification
- Compare transferred image bytes for representative Counter Sales results before and after the change.
- Confirm existing and newly uploaded product photos render in the Add products list.
- Generate staff invoices containing WebP, JPEG, missing, and catalogue-fallback photos; confirm the compact images are embedded and the PDFs remain valid.
- Visually inspect every generated PDF page for photo clarity, scaling, row alignment, pagination, and fallback text.
- Run the focused invoice tests, Counter Sales checks, production smoke check, and preview build.

## Scope
No changes to catalogue photo quality on product-detail pages, product data, stock, wholesale pricing, GST, invoice calculations, or customer invoices.
