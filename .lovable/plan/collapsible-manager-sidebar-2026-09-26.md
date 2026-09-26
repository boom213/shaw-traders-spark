# Collapsible manager sidebar

## Build
- Add an expanded-by-default desktop sidebar preference to the shared manager layout and restore it from browser storage after the page loads.
- Place an accessible panel toggle beside the existing account menu; show it only on large screens.
- Animate the desktop grid between the existing 15rem sidebar and an approximately 3.5rem icon rail so page content uses the released width.
- In collapsed mode, hide group headings and link labels while retaining existing icons, active states, permissions, and hover tooltips.
- Leave the current mobile dropdown and every individual manager page unchanged.

## Technical details
- Keep browser storage access inside effects and click handlers to avoid rendering mismatches.
- Use the existing button, tooltip, navigation, and semantic color components.
- Verify expanded, collapsed, persisted-reload, navigation, active-link, and unchanged mobile behavior.
