# Customer saved addresses

## Account page
- Add an **Addresses** section beside the signed-in customer details, backed by the existing address records.
- Show each saved address with the recipient, primary and alternate phone when present, full address, and a Default badge.
- Add an address dialog for creating and editing records with the same fields and validation used at checkout.
- Provide Edit, Delete, and Set as default actions. Confirm deletion, refresh the list after changes, and ensure choosing a default clears the previous default first.
- Keep all reads and changes scoped to the signed-in customer through the existing access rules.

## Checkout
- Load the signed-in customer’s saved addresses at the delivery-address step.
- Show selectable saved-address cards first, with the default preselected when available; selecting a card fills the form without changing the saved record.
- Add a **Use a new address** choice that clears the form and reveals **Save this address for next time** plus an optional **Make this my default address** control.
- Save a new address only when explicitly requested and only after checkout successfully creates the order.
- Remove the existing server-side behavior that silently creates or overwrites the default address on every order.
- Keep the order’s delivery-address snapshot unchanged, including alternate phone and any order-specific coordinates.
- Preserve the site’s existing sign-in requirement for checkout; browsing and carts remain available without signing in.

## Shared behavior and validation
- Reuse one typed address shape and normalization helpers for account and checkout so names, phone numbers, PIN codes, and optional fields behave consistently.
- Keep the existing 10-digit primary phone, optional valid alternate phone, required street/name, and 6-digit PIN validation.
- Show clear success and failure messages and loading/disabled states for address actions.

## Verification
- Verify add, edit, delete, and single-default behavior on the account page.
- Verify default selection, selecting another saved address, using a new address without saving, and explicitly saving a new default at checkout.
- Verify saved-address actions cannot alter another customer’s records.
- Verify order snapshots still contain the selected/entered delivery address and that placing an order no longer silently overwrites saved addresses.
- Run focused checkout/order tests, type checks, and the preview build.
