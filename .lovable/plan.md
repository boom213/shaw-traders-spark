# Top Category Navigation Redesign

## Goal
Make the persistent category bar beneath the main navigation start and end cleanly, with no partially hidden category names or icons.

## Design
- Redesign only the top category navigation shown beneath **Shop / Trade / Bulk Orders / Service / Contact**.
- Keep the existing category selection, order, icons, links, and neutral storefront styling.
- Present each category as a compact, consistent navigation item with readable icon-and-label spacing.
- Add clearly visible previous and next controls at the left and right edges whenever the full category list does not fit.
- Reserve space for those controls so they never cover or crop the first and last category.

## Responsive behavior
- On wide screens, fit and center the complete category set when space allows.
- At narrower widths, start on the first category and use a contained horizontal scroller with safe edge gutters.
- Disable or hide each direction control when no further categories remain in that direction.
- Preserve mouse-wheel/trackpad scrolling, touch swiping, keyboard focus, active-category styling, and reduced-motion support.

## Scope
- Update the persistent header category bar only.
- Do not change the redesigned homepage category tiles, mobile menu category list, category data, ordering, or destinations.

## Verification
- Check wide desktop and narrower desktop widths to confirm the first and last category are fully visible.
- Confirm the controls scroll to both ends without covering category content.
- Open the first, middle, and last category links and confirm their destinations still work.
- Confirm the preview builds without errors.
