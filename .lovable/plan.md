# Homepage social proof

## Build
- Add a homepage “As seen on our socials” section with linked Facebook and Instagram icons.
- Display the three Facebook videos and three Instagram reels in a responsive one-column mobile, three-column desktop grid.
- Load Instagram’s official embed script once in the browser and process the reel blocks after mounting.
- Add matching Facebook and Instagram icon links beside the business details in the footer.

## Quality
- Keep embedded media within stable aspect-ratio containers so the page does not jump while loading.
- Use accessible labels, external-link safety attributes, and the existing site colors and spacing.
- Verify all six embeds, profile links, desktop/mobile layout, and the latest build.

## Technical details
- Isolate third-party embed behavior in a small client-side homepage component.
- Repair the existing test-ride date hydration warning by using one server/browser-safe minimum-date value while preserving past-date validation.
