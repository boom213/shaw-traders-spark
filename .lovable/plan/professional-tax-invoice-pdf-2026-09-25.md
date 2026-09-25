# Professional Tax Invoice PDF

## Goal
Upgrade the shared Shaw Traders EV tax invoice PDF without changing invoice data, GST calculations, HSN codes, or download permissions.

## Changes
- Embed the existing Shaw Traders EV logo in the top-left header at print-ready resolution, aligned with the company name, address, phone, website, and GSTIN.
- Clean the “Bill to” block by composing address lines only from present values, preventing empty commas, dashes, and phone labels.
- Apply a formal A4 layout with consistent 15–20 mm margins, an outer document border, clearer section spacing, and restrained black/gray styling.
- Restyle the item table with a shaded header, right-aligned Qty/Rate/Amount columns, row separators or alternating fills, and consistent column widths.
- Strengthen the totals area with a separated, larger bold Total row while preserving the current taxable value, discount, delivery, CGST, and SGST fields.
- Add an “Authorized Signatory” line at the bottom-right and move the GST disclaimer into a distinct footer strip.
- Add automatic page continuation for longer item lists so no rows are dropped, cut off, or pushed onto blank pages; repeat the table header on continued pages where needed.

## Validation
- Generate representative GST and non-GST invoices through the shared PDF generator, including an incomplete address and a long item list.
- Confirm the same template works from customer order downloads, staff orders, and counter sales.
- Render every generated PDF page to images and inspect logo sharpness, spacing, alignment, page breaks, clipping, font rendering, and blank pages; revise and re-check any affected pages.
- Run the existing invoice/order tests and verify the current build remains clean.

## Technical details
- Keep `pdf-lib`, which is compatible with the deployed server runtime.
- Bundle the existing local PNG into the PDF; no external image URL or new company data is required.
- Refactor the current single-page drawing logic into reusable header, table, totals, and footer helpers with page-boundary checks.
- Preserve all current invoice query fields and calculations exactly.
