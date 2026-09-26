# Managed product brands

## Goal
Replace free-text product brands with one shared list that authorized admins manage from **Products & Stock**. The same list will appear when adding or editing a product.

## User experience
- Add a **Manage brands** action beside **Add product** on Products & Stock.
- Open a compact brand manager where an admin can add a brand and rename an existing brand.
- Show brands alphabetically and prevent blank or duplicate names.
- Replace the Brand text box in **Add product** with a dropdown containing the managed values and an optional “No brand” choice.
- Replace the Brand text box in the dedicated product editor with the same dropdown.
- After adding or renaming a brand, refresh the dropdown immediately without reloading the page.

## Data and safeguards
- Add a dedicated `product_brands` table with a unique normalized brand name, timestamps, explicit grants, and row-level security.
- Populate the new list from distinct brand names already assigned to products, so existing brands remain available.
- Restrict brand creation and renaming to Manager, Owner, and Super Admin on the server; Staff remains read-only.
- When a brand is renamed, update products using the old value in the same server operation so catalogue filters, product pages, and exports stay consistent.
- Validate product creation and editing against the managed brand list; preserve an empty brand as valid.
- Record brand additions and renames in the existing audit log with staff attribution.

## Technical scope
- Apply one additive database migration for the managed brand table, grants, policies, and initial backfill from current product values.
- Add server functions for listing, creating, and renaming brands.
- Wire a shared brand query into Products & Stock, Add Product, and the full product editor.
- Keep the existing `products.brand` field for compatibility with storefront queries, imports, reports, and exports.
- Update the project’s architecture rule and roadmap to document the managed-brand source of truth.

## Verification
- Confirm Manager, Owner, and Super Admin can add and rename brands; Staff cannot mutate them.
- Confirm duplicate and blank names are rejected.
- Confirm Add Product and Edit Product show the same current dropdown values.
- Confirm renaming a brand updates existing products and search results.
- Run focused tests, type checks, the preview build check, and desktop/mobile interaction checks for the Products & Stock flow.
