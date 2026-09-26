# User-friendly product specifications editor

## Goal
Replace the raw “Specifications (JSON)” box on the product editing page with a simple list of specification name/value rows that staff can edit without knowing JSON.

## Changes
- Show existing specifications as rows with two clear fields: **Specification name** and **Value**.
- Add an **Add specification** button and a remove icon on every row.
- Keep rows compact, mobile-friendly, and easy to scan alongside the existing Voltage, Capacity, Wattage, Warranty, Weight, and Dimensions fields.
- Start with one empty row when a product has no extra specifications.
- Ignore completely blank rows, but require both fields when either side of a row is filled.
- Prevent duplicate specification names, using case-insensitive comparison, and show a clear message before saving.
- Preserve the existing stored specification format and public product-page display, so no database migration or storefront redesign is needed.
- Keep the existing Manager+ product-edit permissions and audit behavior unchanged.

## Verification
- Confirm an existing product’s saved specifications load into editable rows.
- Add, edit, and remove rows, save, reload, and verify the values persist.
- Check validation for half-filled and duplicate rows.
- Confirm the public product page still displays the saved specifications correctly.
- Verify the editor at desktop and mobile widths and confirm the app builds cleanly.
