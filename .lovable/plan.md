# Hide customer trade access from staff

## What will change
- Add `/trade` to the validated customer destination list so sign-in return paths safely cover both `/trade` and `/trade/pad`.
- Move the customer Trade Account and Bulk Order Pad pages under the existing signed-in, non-staff customer guard.
- Hide the entire Trade & wholesale account-menu section for verified staff accounts while preserving all existing customer states.
- Leave `/manage/trade`, trade application rules, pricing, credit terms, account profile sections, header links, and mobile tabs unchanged.

## Verification
- Add focused checks that both customer trade routes use the shared guard and staff cannot see the dropdown section.
- Confirm staff direct visits redirect to their permitted manager page, while `/manage/trade` remains available.
- Confirm a guest `/trade` visit returns through sign-in safely.
- Run focused tests and check the preview build.
