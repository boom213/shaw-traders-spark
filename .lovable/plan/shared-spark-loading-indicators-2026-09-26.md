# Shared Spark Loading Indicators

## Goal
Replace generic loading visuals with two reusable, accessible loaders that inherit the existing brand-green `--primary` token. The implementation will follow the written design description because no artifact link or SVG/CSS was included.

## Build
- Add a shared loading-indicator module with:
  - `SparkRing` in small, medium, and large sizes: a muted circular track, rotating primary-color arc, and centered lightning glyph with a soft pulse.
  - `SparkCharge`: a larger battery silhouette with a rising primary-green charge, restrained drifting sparks, and optional loading label for page or section states.
- Add component-scoped animation styles and keyframes to the global design system. Under `prefers-reduced-motion`, stop rotation, pulsing, rising fill, and particle drift while preserving a clear static loading indicator.
- Keep the components theme-safe by using semantic `primary`, `muted`, `foreground`, and background tokens only; no fixed brand colors.

## Apply Across the Site
- Replace every current `Loader2` loading use with `SparkRing`, including trade uploads/submission/document checks, availability checks, vendor payments, trade administration, product photo uploads, payment-report exports, catalogue uploads, and home/about media uploads.
- Add `SparkRing` beside existing text-only inline busy states such as “Please wait…”, “Creating sale…”, and similar button progress labels where space permits.
- Use `SparkCharge` for page or substantial section waits, including checkout cart/auth initialization, account initialization, order loading, manager overview/list sections, vendor QR loading, and the shop's initial product-loading state.
- Replace the shop's initial product skeleton moment with `SparkCharge`; retain skeletons where they intentionally preserve a stable table/card layout during secondary or paginated refreshes.
- Leave rotating action icons such as “Re-check” or “Refresh report” as action feedback rather than replacing their icon identity, but ensure reduced-motion disables their rotation.

## Accessibility and Layout
- Expose a status label for standalone loaders and mark decorative loaders hidden when adjacent text already announces progress.
- Keep compact loaders within existing button/icon dimensions so controls do not resize or shift.
- Give `SparkCharge` stable dimensions suitable for mobile and desktop sections without blocking surrounding navigation.

## Verification
- Run the TypeScript checks and targeted tests, then confirm the preview build is clean.
- Exercise storefront and manager examples in desktop and mobile viewports: checkout initial loading, shop loading, one inline submit/upload state, and one manager section state.
- Verify reduced-motion produces static indicators and no layout overlap or shift.
