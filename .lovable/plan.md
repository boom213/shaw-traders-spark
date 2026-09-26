# Fix the six reported storefront issues

## Outcome
Deliver only the six fixes in the uploaded brief, without changing unrelated storefront, staff, security, or database behavior.

## Changes
1. **Empty the cart reliably after checkout**
   - Add an explicit store action that clears the local cart and immediately persists the complete updated shopping-list record for a signed-in customer.
   - Await that persistence in checkout before opening the order page, while preserving the normal debounced sync for everyday cart changes.
   - Keep guest checkout clearing local-only.

2. **Show signed-in customers their scooter bookings**
   - Add an authenticated booking reader scoped to the current customer and backed by the existing owner-only booking policy.
   - Return only the fields needed by the account page, including the public tracking token.
   - Add a **My Bookings** section with model, booking number, status, token paid, balance due, and a link to each existing booking-status page.

3. **Keep trade approval feedback visible**
   - After a successful approve, reject, or more-information decision, keep the current card visible for about 900 ms before refreshing the application list.

4. **Update the shop address**
   - Replace the shared business address with `CG2W+WGV, near Debi Radha Marriage Hall, Budbud, West Bengal 713403`.
   - Update the contact-page description and homepage business address markup to match, while retaining the existing locality, region, postcode, and country fields.

5. **Gate Find Parts for public visitors**
   - Keep all existing links and SEO metadata unchanged.
   - Show a compact full-width muted **Coming Soon** message to regular visitors.
   - Use the existing staff-session check so signed-in staff with manager-panel access continue to see the current finder and category grid.
   - Avoid loading the finder’s catalogue data for visitors who only receive the placeholder.

6. **Stop vehicle filters leaking across visits**
   - Remove the automatic stored-model injection on ordinary `/shop` visits and refreshes; only explicit URL filters from the Find Parts flow will apply.
   - Clear the remembered vehicle when leaving `/shop` and remove the transient model filter from the shop history entry, so browser Back does not restore it unexpectedly.
   - Preserve normal category/model filtering while the customer remains on `/shop`.

## Verification
- Add focused tests for immediate cart persistence and customer-scoped booking output.
- Exercise signed-in and signed-out `/find-parts` behavior.
- Exercise Find Parts → Shop, refresh, leave, and browser-Back behavior to confirm the filter does not return.
- Verify the updated address in visible contact content, map destination, metadata, and homepage structured data.
- Confirm the trade decision toast remains readable before the list refreshes.
- Run the relevant existing checkout, booking, and storefront tests, then confirm a clean preview build. Any unrelated pre-existing failure remains out of scope.

## Technical notes
- No schema migration is needed: `vehicle_bookings.profile_id`, `public_token`, owner-scoped reads, and the required booking fields already exist.
- The booking reader will use the authenticated request context; it will not trust a customer ID supplied by the browser.
- The cart flush will upsert the entire current list payload with only `cart` changed to empty, preventing wishlist/saved/recently-viewed data loss.
