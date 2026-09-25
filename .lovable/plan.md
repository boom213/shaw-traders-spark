# Super Admin product deletion

## What will change

- Add a **Delete** button beside **Save** on each `/manage/catalogue` product card.
- Show the button only to **Super Admins**; other catalogue roles keep their current editing access without deletion controls.
- Open a clear confirmation dialog naming the product and warning that permanent deletion cannot be undone.
- Keep the product unchanged when the dialog is cancelled.
- On confirmation, permanently delete the product through a server-protected action that independently verifies the caller is a Super Admin.
- Refresh the catalogue totals, current page, dashboard counts, and storefront product lists after deletion. If deleting the last item on a page empties that page, move back to the preceding valid page.
- Show a success message after deletion and a useful error when the product cannot be removed because a booking, service request, valuation, finance request, or other retained business record still references it.

## Safety and data behavior

- Related product photos, prices, compatibility records, reviews, stock alerts, and scooter pricing/specification records already configured for cascading deletion will be removed with the product.
- Historical order items and product enquiries configured to keep history will retain their snapshots and detach from the deleted product where allowed.
- The database will block deletion when protected records still depend on the product; the interface will explain that the product should be hidden instead.
- Every successful deletion will be recorded in the staff audit log before the product is removed, including its name, SKU, and category.

## Verification

- Verify Super Admin sees Delete beside Save and must confirm before removal.
- Verify Cancel preserves the product.
- Create a temporary test product, permanently delete it, and confirm it disappears from catalogue and storefront queries.
- Verify a lower staff role cannot see the button or call the deletion action directly.
- Verify blocked deletion returns a readable message without changing the product.
- Check desktop and mobile layouts and confirm the project remains error-free.
