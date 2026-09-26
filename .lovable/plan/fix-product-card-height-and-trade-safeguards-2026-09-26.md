# Fix product card height and trade safeguards

## Changes
- Make every product card fill its carousel or grid slot so neighboring cards have equal visible height.
- Before updating trade credit terms, load the profile's latest trade application and require it to be approved; otherwise return the requested clear error.
- Before processing a trade decision, read the current application status. If the same approved or rejected decision was already recorded, return success immediately without updating, auditing, or notifying again.

## Verification
- Run focused tests or type checks covering the changed trade logic.
- Confirm the preview build completes successfully.
