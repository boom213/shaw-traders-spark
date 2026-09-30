# Safer catalogue imports and product deletion

## Part A — CSV price-list workflow

- Add a first `row` column to downloads, numbered in export order, while keeping SKU as the only import match key and ignoring any uploaded `row` values.
- Track each uploaded data line’s actual position as `sourceRow`, include it on preview changes, and show a **Row** column in the change table.
- Detect repeated SKUs with all source-row positions, show a destructive warning, disable Apply, and reject duplicate files again on the server so the last row can never silently win.
- Add a paginated **Recent imports** accordion using the existing 8-row pager. Read existing `products.csv_import` audit entries newest-first and show actor, time, saved count, and expandable field changes, including a clear first-50 notice when the audit is truncated.
- Refresh import history after a successful upload. Older audit entries without row numbers will remain readable.

## Part B — Product deletion safety

- Before permanent deletion, count customer reviews. If reviews exist, return a structured review-warning result unless the Super Admin explicitly confirms review deletion.
- Extend the catalogue delete dialog to a second, stronger confirmation when reviews are found. Offer **Use Hidden instead** through the existing product status save path or **Delete anyway** through the protected delete action.
- Preserve the existing retained-record protection and order-history behavior unchanged.
- Keep unresolved cart lines visible as **This part is no longer available**, exclude them from totals, and let customers remove them so the cart badge immediately matches.
- Keep unresolved wishlist and saved-for-later entries visible with removal controls. Recently viewed items will be pruned quietly because they are browsing history rather than purchase intent.
- Add only the minimal store-list removal helpers required by those controls; keep the current local and account synchronization model.

## Verification

- Add focused tests for export numbering, re-import compatibility, source-row tracking, duplicate rejection, audit-history parsing, review-gated deletion, unavailable list items, and resolved-only cart totals.
- Verify the import preview/history and both delete dialogs on desktop and mobile.
- Verify an unavailable cart item remains visible after refresh, can be removed, and never affects subtotal.
- Run the focused tests, type checks, and confirm the preview build is clean.
