# Homepage Category Strip Redesign

## Goal
Make the homepage categories fully visible and centered, eliminating the clipped items at both edges while preserving the existing category links and ordering.

## Design
- Apply the selected **Industrial Minimalist Strip** direction only to the homepage category section.
- Display the first six managed categories plus **Others** as compact, equal-size icon tiles.
- Use the selected neutral treatment: white surfaces, soft neutral background, dark charcoal text, and muted green emphasis through existing semantic theme tokens.
- Keep category names centered and readable, with **Others** visually emphasized as the final destination.
- Preserve the current site typography system while giving tile labels the selected strong catalogue weight, avoiding a site-wide font change.

## Responsive behavior
- Center all seven tiles in a wrapping row on wide screens so neither edge is clipped.
- On smaller screens, retain a contained horizontal carousel with safe left/right gutters, fully visible navigation controls, and stable tile widths.
- Ensure touch scrolling, keyboard navigation, focus states, and reduced-motion preferences continue to work.

## Scope
- Update the homepage category carousel component and its presentation only.
- Do not change the header category menu, category data, category management, product filters, or destinations.

## Verification
- Check the homepage at desktop and mobile widths.
- Confirm the first tile, last **Others** tile, and navigation controls remain fully visible.
- Open a category and **Others** to confirm both routes still work.
- Confirm the preview builds without errors.
