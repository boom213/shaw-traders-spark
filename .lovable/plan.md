# Fix product photos in Staff Invoice PDFs

## Goal
Make product photos reliably appear in both staff invoice downloads: Orders and Counter Sales.

## Confirmed cause
- Recent order items store photos as relative links such as `/api/public/photo/...webp` and `/demo/parts/...jpg`.
- The invoice is generated on the server, where those relative links cannot be fetched as written.
- Uploaded catalogue photos are WebP, but the current PDF code embeds only PNG and JPEG.
- Some order items genuinely have no snapshot or current catalogue photo, so they need a clear empty-photo fallback rather than a silent blank.

## Implementation
1. Add one server-side invoice-photo resolver that supports:
   - private uploaded product photos referenced by `/api/public/photo/...`;
   - bundled/demo image paths;
   - absolute HTTPS image links and test data URLs.
2. Resolve relative links safely against the configured site origin where appropriate, and read uploaded product photos directly from protected file storage instead of making a fragile self-request.
3. Decode WebP with an edge-compatible JavaScript/WASM image decoder and convert it to a PDF-embeddable PNG; continue embedding PNG/JPEG directly.
4. Prefer the immutable order-item photo snapshot. If it is empty, fall back to the product's current first catalogue photo without changing the saved order.
5. Render a compact `No photo` placeholder in the Photo cell when neither source exists or an image cannot be decoded, while allowing the rest of the invoice to generate.
6. Keep customer invoices unchanged and keep Staff Invoice controls restricted to the manager panel.

## Verification
- Add PDF tests for relative WebP, relative JPEG, absolute/data image sources, missing snapshots with catalogue fallback, and failed/missing images.
- Generate visual QA PDFs, convert every affected page to images, and inspect photo scaling, row alignment, pagination, and fallback text.
- Download a real staff invoice from Orders and Counter Sales and confirm actual catalogue photos appear.
