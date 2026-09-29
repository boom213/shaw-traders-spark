# Retail minimum-order safeguards

## Goal
Prevent uneconomical retail orders with owner-configurable order floors, while leaving normal orders unchanged when both settings are `0`.

## What will change
- Add **Minimum order value** and **Minimum order value for Cash on Delivery** to Site Settings beside the existing COD limit.
- Show a live shortfall message and disable checkout when the post-discount goods value is below the store-wide minimum.
- Keep online payment available when only the COD minimum is missed, while disabling COD with a clear reason.
- Apply configured per-product minimum quantities and order multiples to retail customers as well as trade customers.

## Enforcement
- Add both settings to the existing shop settings record, public settings allowlist, and current save flow.
- Update the latest `create_order` database routine without changing pricing, coupons, shipping, GST, stock, or payment calculations.
- Check the general minimum against subtotal minus discount.
- Check the COD minimum alongside the existing COD maximum, using the final order total.
- Keep `0` as “disabled” for both settings.
- Do not apply these safeguards to Counter Sales or trade-credit ordering.

## Verification
- Confirm default zero values preserve current checkout behavior.
- Test general minimum blocking, coupon-adjusted shortfalls, COD-only minimums, COD maximums, and retail product quantity rules.
- Confirm online payment remains available when only COD is below its minimum.
- Run checkout/order tests and verify the customer and Site Settings screens at desktop and mobile sizes.

## Technical details
- Apply one additive database migration containing the two columns and the complete current `create_order` definition with its existing permissions preserved.
- Extend shared settings types and pure eligibility helpers so client-side messages match database enforcement.
- Regenerate database types through the migration workflow and update focused tests.
