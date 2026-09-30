# Wholesale quote list journey

## Goal
Give approved wholesale customers a separate, cart-like quote list where they can collect parts in any quantity, review them, and submit one quote request. Retail customers, guests, staff screens, and checkout stay unchanged.

## What will change
- Add a client-side wholesale quote draft stored separately from the retail cart, including resolved product lines, quantities up to the existing quote limit, and unmatched bulk-pad text for the final note.
- On catalogue cards and product details, replace retail buying/enquiry controls with **Add to quote** only for approved non-staff wholesale customers. Product details will include a freely editable quantity; stock will not cap quote quantities.
- Replace the cart shortcut with **Quote list** and its line-count badge for wholesale customers in desktop and mobile navigation. Signed-out and retail visitors keep the cart immediately; signed-in accounts wait for role resolution to prevent incorrect controls flashing.
- When a wholesale customer opens `/cart`, show a short pointer to their quote list before rendering retail cart content. Retail cart behavior remains untouched.
- Add `/trade/quote-list` with product image, name, SKU, unrestricted quantity controls, remove, empty state, and Continue. It will show no prices, totals, coupons, shipping, or stock counts.
- Add `/trade/quote-submit` with read-only lines, prefilled editable contact name/mobile, optional note, accessible field errors, and a single guarded submission through the existing atomic quote function. Success clears the draft and opens **My quotes**.
- Change Bulk Order Pad’s request action to add matched lines into the same quote list and carry unmatched lines into the submission note instead of submitting directly.
- Translate every new customer label in English, Bengali, and Hindi, and map customer quote statuses to plain language while leaving staff status labels unchanged.

## Access and safety
- Approved wholesale and non-staff is the only audience for quote controls and quote-list pages.
- Staff ProductCard usages will never receive quote controls.
- Existing retail cart storage and logic, checkout, quote database migration, quote server functions, staff quote management, and product structured data will not change.
- Draft persistence will use a new browser-storage key and hydration-safe loading.

## Verification
- Add focused tests for role-resolution behavior, independent quote storage, unrestricted quantities, bulk-line merging and note carryover, status labels, and double-submit protection.
- Verify desktop and mobile flows for wholesale, retail, guest, and staff accounts, including slow-load no-flash behavior.
- Submit one real wholesale quote in the preview, confirm it appears in **My quotes** and the staff quote queue with correct quantities, then verify no retail order/payment is affected.
- Check English, Bengali, and Hindi labels and confirm the preview build is clean; unrelated pre-existing test failures will be reported separately if still present.
