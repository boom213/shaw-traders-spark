# Product photo selection and reordering

## Goal
Let catalogue-authorized staff choose the main product photo and control the display order directly from the product editor shown in the screenshot.

## What will change
- Add a clear **Set as main** action to every photo that is not currently first.
- Keep the first photo marked **Main**; selecting another main photo will move it to position 1 automatically.
- Add accessible move-left and move-right controls to each photo, disabled at the ends, so ordering works reliably on desktop, mobile, keyboard, and touch devices.
- Show each photo's position so the saved gallery order is easy to understand.
- Preserve the existing eight-photo limit, upload actions, and individual delete action.
- Disable conflicting photo actions while an order change is being saved, restore the previous order if saving fails, and show success/error feedback.
- Refresh the editor, All Products list, catalogue lists, Shop data, and homepage data after a photo change so the newly selected main image appears everywhere without stale results.

## Existing behavior this will use
- Product photos already have a saved `sort_order`.
- Customer-facing lists and product galleries already sort by that value and treat the first photo as the main image.
- The existing protected photo-save operation already checks catalogue permission and audits photo changes, so no database migration is needed.

## Verification
- Confirm selecting any photo as main moves it first and updates Shop/list thumbnails.
- Confirm left/right reordering persists after refresh and controls stop at the first/last positions.
- Confirm deleting the main photo promotes the next photo.
- Confirm failed saves restore the previous order.
- Check the photo controls on desktop and mobile, then run focused tests and confirm the preview builds successfully.
