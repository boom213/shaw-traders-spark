# Product editor from All Products

## Goal
Let authorized catalogue admins open a product editor by clicking a product image or name on `/manage/all-products`, while preserving read-only access for Staff.

## What will change
- Make each product image and name clickable for Manager, Owner, and Super Admin roles.
- Open a dedicated manager product page for the selected product.
- Allow editing the complete parts-product record: name, SKU, category, subcategory, brand, model, retail/wholesale/MRP prices, stock, reorder warning, shelf, visibility, ordering mode, description, specifications, electrical details, warranty, weight, dimensions, shipping information, box contents, HSN code, compatibility, and photos.
- Keep Staff users on the current read-only directory with no edit link.
- Validate values server-side, save changes with staff attribution in the audit log, and refresh storefront/catalogue data after saving.
- Preserve existing product deletion restrictions and the separate Products & Stock page.

## Technical details
- Add a protected `/manage/products/$productId` route under the existing `catalogue` permission.
- Add authenticated catalogue read/update operations rather than exposing browser-side database writes.
- Reuse the existing photo upload and ordering controls.
- Add unique no-index metadata and verify authorized access, Staff denial, save behavior, and mobile/desktop layout.
