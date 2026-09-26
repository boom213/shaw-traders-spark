# Restore the published site and keep staff-invoice photos

## Confirmed issue

The published site currently returns HTTP 500 on every page. Production logs identify the recent image converter as the cause: its WebAssembly file is missing from the deployed server bundle (`No such module "wasm/photon_rs_bg-….wasm"`). The ordinary build passes, but the failure occurs when the published server starts.

## Plan

1. **Restore the site first**
   - Remove the incompatible image-converter package and every reference to it so no missing WebAssembly file is loaded at server startup.
   - Keep PNG/JPEG invoice photo support, relative/private photo resolution, catalogue fallback, and the visible “No photo” fallback intact.

2. **Restore WebP support safely**
   - Replace the converter with an implementation that is bundled directly and does not depend on a separately deployed runtime file.
   - Keep conversion inside the staff-invoice path only, so normal storefront requests never initialize invoice image processing.
   - Preserve snapshot-first behavior: saved order photo, then current catalogue photo, then “No photo.”

3. **Prevent another publish-only outage**
   - Add a production-server smoke check that starts the built server path and requests `/`, not only a development build check.
   - Keep the WebP staff-invoice regression test and verify that the generated PDF visibly contains the photo.

4. **Verify and republish**
   - Confirm `/`, a public product page, and manager pages render without HTTP 500.
   - Download a real Staff Invoice containing uploaded WebP product photos and visually inspect it.
   - Publish the repaired version and confirm the public URL responds successfully.

## Scope

No storefront design, checkout, order data, customer invoices, or manager workflows will change.
