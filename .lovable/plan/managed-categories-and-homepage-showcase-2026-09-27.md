# Managed categories and homepage showcase

## Goal
Make part categories owner-managed, give every category a selectable icon, add the requested category catalogue, and keep the homepage focused on six categories plus an **Others** link.

## Verified starting point
- The database currently has six categories, ordered 1–6, and no `icon` field.
- Category reads are already sorted by `sort_order`, and the same category feed supplies the storefront, filters, and product forms.
- Category icons are selected from a slug-based code map in the grid, carousel, and persistent header strip.
- Site Settings is an Owner-only area with General, Home Banners, About Gallery, and Brand Catalogue tabs.
- Category deletion is not protected by the database relationship: deleting a category would currently leave its products without a category, so the application must block that action explicitly.
- Empty categories are currently hidden from public category reads. Because the requested new rows start empty, they would not appear on `/categories` without a deliberate visibility change.

## Implementation

### 1. Extend and seed category data
- Add a nullable `icon` key to categories and expose it through the shared category type and category read functions.
- Backfill the six existing rows with their current icon choices so their appearance does not change.
- Insert these 18 categories after the current six, with stable slugs, concise customer-facing descriptions, icon keys, and sequential ordering:
  - Body Parts
  - Wheels & Tyres
  - Suspension
  - Footrests
  - Locks & Latches
  - Electrical Parts
  - Cables & Wiring
  - Accessories
  - BMS
  - Throttle
  - Display & Meter
  - DC Converter
  - Tools
  - Connectors
  - Seats & Comfort Accessories
  - Horns & Switches
  - Mirrors
  - Bearings & Hardware
- Keep Electric Scooters out of the part-category list because scooters already use the separate vehicle catalogue.
- Allow public reads of the category directory, including categories that do not yet contain a visible product, so the newly created catalogue is actually visible on `/categories`. Product visibility remains unchanged.

### 2. Centralize icon resolution
- Move the fixed Lucide icon registry and category-icon resolver into a small shared module.
- Resolve icons by the saved `icon` key first, then by the existing slug fallback, then use the generic package icon.
- Update the category grid, homepage carousel, and persistent header strip to use the resolver.
- Reuse the same registry in the category editor so owners choose only supported icons and see a visual preview.

### 3. Add the Owner-only Categories tab
- Add **Categories** to Site Settings without changing the existing Owner-only access rule.
- Build a phone-friendly ordered list with icon preview, name, slug, description, product count, and up/down controls.
- Add a category form with name, auto-generated editable slug, description, and icon picker.
- Support editing existing categories and saving audited changes.
- Save reordering as one validated database operation, normalize positions, and refresh every category-dependent view after success.
- Before deletion, count assigned products server-side. If any exist, keep the category and show: “Reassign or remove its products before deleting this category.”
- Audit create, edit, reorder, and delete actions with the signed-in owner’s identity.

### 4. Focus the homepage category row
- Render only the first six ordered categories on the homepage.
- Append a seventh **Others** tile styled consistently with the carousel cards, using a grid/more icon and linking to `/categories`.
- Keep `/categories` as the complete ordered directory.
- Leave the hardcoded persistent header category selection and order unchanged, as requested; only its icon lookup becomes data-driven.

## Technical details
- Add one migration for the new column, icon backfill, category seed rows, public category-read policy adjustment, and atomic reorder function. Preserve existing grants and row-level protections.
- Put owner-protected category management server functions in a dedicated client-safe `*.functions.ts` module, with strict slug/icon validation and duplicate-name/slug feedback.
- Invalidate both the admin list and shared storefront category/home queries after mutations.
- Update the categories page description so it no longer claims a fixed count of fourteen.
- Record the new category-management ownership and icon-registry architecture in project documentation.

## Verification
- Test icon fallback, slug normalization, duplicate rejection, protected deletion, and deterministic reordering.
- Verify owner access to create/edit/reorder/delete and verify managers cannot open Site Settings or invoke its category actions.
- Verify a new empty category appears on `/categories` and in product category selectors.
- Verify the homepage shows exactly six ordered category cards plus **Others** on desktop and mobile.
- Verify the persistent header category set/order is unchanged and all category links still work.
- Run the relevant tests and confirm the preview finishes without build or runtime errors.
