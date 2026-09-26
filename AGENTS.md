<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- All Products is Staff-read-only; Manager+ edits products/brands through catalogue-protected routes.
- Keep wholesale receipts auditable and reporting totals non-overlapping.
- Counter-sale Vendor QR is optional; selecting one atomically links its vendor payment.
- Keep saved addresses customer-controlled; checkout snapshots the chosen address and never silently overwrites the address book.
- Expose only the connector's referrer-restricted Google Maps browser key through a server function; keep server-side Maps credentials private.
- Serve public shop settings through a server-side allowlist so private operational fields are never readable from the browser database client.
- Keep one A4 invoice; use snapshot then catalogue photos, 5s fetch timeouts, and bundled WebP conversion.
- Keep homepage social links iframe-free and lazy-mounted below the primary shopping content so third-party media does not delay the storefront.
- Route every storefront brochure download through one shared validated enquiry dialog and send its fixed-recipient notification server-side.
- Control homepage showroom visibility through the shared shop settings record so staff changes apply consistently to the storefront.
- Persist post-checkout cart clearing immediately before navigation; keep debounced list syncing only for ordinary shopping-list changes.
- Read customer scooter bookings through authenticated owner-scoped access and keep public-token tracking as the booking detail path.
- Require sign-in for orders, keep guest browsing/carts, auto-release unpaid stock after 30 minutes, and reject late-payment revival.
- Centralize manager refresh; keep sidebar collapse browser-local. Page by 8; aggregate in SQL.
- Router events never mutate history or broadcast grid state; log errors. Use SparkRing inline and SparkCharge for page waits.
- Banners, About gallery, and brand catalogue live in Owner-only Site Settings; hide Find Parts publicly but retain its staff-only direct route.
