# Repair guest cart restoration

## Goal
Keep guest carts usable across refreshes and catalogue changes, without showing false “no longer available” rows or allowing a ₹0 checkout.

## Changes
1. **Make catalogue restoration reliable**
   - Return and handle catalogue lookup errors instead of silently converting them into an empty product list.
   - Show a retryable cart-loading error when the catalogue cannot be reached; do not label every item as deleted.

2. **Reconcile stale guest cart entries**
   - After a successful catalogue lookup, identify IDs that genuinely no longer exist or are no longer publicly available.
   - Remove those stale entries from the guest cart and saved-for-later list while preserving valid products and quantities.
   - Tell the shopper which unavailable entries were removed, once, rather than leaving unusable placeholder rows.

3. **Protect checkout**
   - Disable proceeding while cart products are loading or the catalogue lookup has failed.
   - Do not allow checkout when no valid purchasable line remains or when the computed total is ₹0.
   - Keep the existing rule: guests may build a cart, but sign-in is required only after entering checkout.

4. **Regression coverage and verification**
   - Test a normal guest add-to-cart → cart → checkout → sign-in flow.
   - Test refresh persistence, a mixed valid/deleted cart, saved-for-later cleanup, lookup failure, and prevention of ₹0 checkout.
   - Verify the repaired flow in a fresh guest browser on desktop and mobile.

## Technical details
- Keep browser cart persistence and cross-tab synchronization unchanged.
- Reconciliation will run only after a successful authoritative catalogue response, preventing temporary network failures from deleting a shopper’s cart.
- No order, pricing, stock, account, or wholesale business rules will change.
