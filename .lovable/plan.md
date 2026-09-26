# Fix invoice header overlap and add an internal Staff Invoice

## Goal
Keep the existing customer invoice unchanged except for preventing long business names from overlapping the invoice details. Add a separate staff-only PDF that helps picking and packing by showing each product’s photo and shelf/rack location.

## Confirmed current state
- The legal business name is drawn without a width limit in the invoice header, while nearby variable text already uses the existing truncation helper. This can collide with the right-aligned invoice title and details.
- Manager order data already includes each item’s saved image and current rack location.
- Counter-sale list items include the saved image, but their product join currently selects only the SKU, not the rack location.
- Customer invoices and staff invoice downloads currently share the same PDF generator. Both manager download paths already require staff access; the public order page uses a separate customer-authorized function.

## Implementation
1. **Constrain the invoice header**
   - Calculate the left header’s usable width from the logo/details start to the reserved right-side invoice block.
   - Pass the legal name through the existing `fitText` helper so long names end with an ellipsis rather than overlapping “TAX INVOICE”, invoice number, date, or GSTIN.

2. **Add a staff-only PDF variant**
   - Extend invoice items with optional image and rack-location fields and add an internal staff-copy mode to the shared A4 generator.
   - Preserve the existing tax, HSN, totals, pagination, footer, fonts, and customer invoice layout.
   - In staff mode, add a clear “STAFF COPY — INTERNAL USE ONLY” notice, a small product thumbnail, and a Shelf/Rack column with `—` when unavailable.
   - Increase staff-row height and recalculate page breaks so thumbnails, rows, totals, signature, and footer never collide.
   - Fetch each image server-side, detect PNG/JPEG from response type or bytes, embed it proportionally, and silently omit only that thumbnail if retrieval or decoding fails.

3. **Supply the staff item data securely**
   - Let the staff invoice loader fetch each order item’s saved image plus its product rack location.
   - Include `rack_location` in the counter-sale item join so its details remain consistent with the staff PDF data.
   - Keep the customer invoice function in customer mode, with no rack locations, internal notice, or staff controls exposed publicly.

4. **Add manager controls**
   - On **Manage Orders**, retain “Download invoice” and add “Staff Invoice” beside it.
   - On **Counter Sales**, add “Staff Invoice” beside the existing invoice action in both the sale row and sale-detail dialog.
   - Use the existing staff-protected server functions; no public endpoint or customer-facing button will be added.

## Validation
- Add PDF tests for a very long legal name, staff-copy metadata/content, missing rack values, broken image URLs, and long multi-page item lists.
- Generate representative customer and staff PDFs, render every page to images, and visually inspect for header overlap, clipped thumbnails, column collisions, broken glyphs, footer/signature collisions, and pagination errors.
- Verify both manager download flows while signed in, and confirm the public order page still downloads only the standard customer invoice.
