# Multi-line wholesale quote system

## Goal
Let approved wholesale customers turn the existing Bulk Order Pad results into one quote request, track and answer priced quotes from their account, and let Manager/Owner/Super Admin price those requests. Retail, signed-out, checkout, cart, counter sales, enquiries, and the existing single-product quote link remain unchanged.

## Database and security
- Add migration `0066` with `quote_requests` and `quote_request_items`, the requested fields, foreign keys, checks, indexes, explicit grants, RLS, and SELECT-only owner/staff policies.
- Grant customers and staff read access only; add no customer-facing insert, update, or delete policies. All writes remain server-authorized and customers can never supply prices.
- Add service-only transactional database functions for creating a parent request with all lines and for pricing all lines with the parent status update. This guarantees no partial request or partially priced quote can be stored.
- Generate `QT-YYMMDD-NNNN` references inside the transaction with bounded uniqueness retries.
- Reload the database API schema and update generated database types after applying the migration.

## Server functions
Create a separate `quote-requests.functions.ts` module so the current single-product quote flow is untouched.

- `submitQuoteRequest`: resolve the current account server-side; require approved wholesale status; validate 1–100 product lines; clamp quantities to 1–9999; resolve active product names/SKUs on the server; atomically create the request and snapshots.
- `myQuoteRequests`: return only the signed-in customer’s requests and lines, newest first; never return the internal staff note.
- `respondToQuote`: allow only the request owner to accept or reject a currently priced, unexpired quote; never update prices.
- `listQuoteRequests`: require the new Quotes capability; support status, customer/reference search, eight-row paging, customer details, line counts, and priced totals.
- `priceQuoteRequest`: require the Quotes capability; validate every item price, required future expiry, optional line/staff notes; atomically price every existing line and audit the action.
- Return clear, typed success/error results for expected validation and state conflicts.

## Customer experience
### Bulk Order Pad
- Keep the current parser, availability results, prices, and ordering-mode independence.
- For approved wholesale customers only, replace the existing summary action with **Request a quote**.
- Open a small confirmation dialog showing the ready-line count and an optional note; submit only product IDs and quantities.
- On success, show confirmation and navigate to the account’s Quotes section without clearing the pad state.
- Prevent duplicate submission while saving and after success until the checked list changes.
- Keep **Contact us to order** exactly as-is for retail and signed-out visitors.

### Account and navigation
- Add **My quotes** for approved wholesale customers, with newest-first cards showing reference, date, status, line count, priced total, expiry, expandable line details, and customer-facing decision notes.
- Show clear expired treatment based on the current time. Offer Accept/Reject only for priced, unexpired quotes and refresh the list after a response.
- Introduce a separate `showOrders` condition so the orders query does not run and the Orders section does not render for approved wholesale customers. Wishlist, saved items, bookings, and profile details remain unchanged.
- Replace wholesale customer links to My Orders with My Quotes, including the account menu and trade dashboard. Retail links remain unchanged.

## Staff experience
- Add a `quotes` capability mapped to Manager and register `/manage/quotes`; inherited access gives it to Manager, Owner, and Super Admin only.
- Add Quotes near Enquiries in both staff navigation menus.
- Build `/manage/quotes` using the existing Enquiries page conventions: status filters, search, eight-row pagination, loading and empty states, and compact request cards.
- Each request expands into editable line prices and notes, a running total, required future expiry, internal staff note, and **Send priced quote** action with inline validation.
- Do not add notifications, exports, conversion to orders, payments, invoices, ledger work, stock changes, or quote version controls.

## Verification
- Add focused tests for capability access, trade-only submission, 100-line/quantity limits, ownership, expiry and state transitions, customer data redaction, and wholesale-only order hiding logic.
- Apply migration `0066` before relying on the tables; verify schema grants and policies.
- Run focused tests plus the full test suite and check preview build diagnostics.
- Browser-check signed-out/retail pad behavior, approved wholesale submit/history/respond flow, Manager pricing with required expiry, and blocked Staff/Sales Manager access.
- Confirm direct customer writes and cross-customer reads fail, and confirm the existing `/quote/$token` flow still loads unchanged.

## Technical notes
- Use existing server-side identity and staff authorization helpers; never trust profile IDs, snapshots, names, or prices from the browser.
- Keep all privileged client imports inside server handlers.
- Record the quote transaction/security boundary in `AGENTS.md` and mark the completed task in `roadmap.md`.
