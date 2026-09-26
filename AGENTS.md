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

- Keep All Products read-only for Staff; Manager and higher may open its dedicated full editor through catalogue-protected routes.
- Model wholesale sales and vendor payouts as atomic, auditable records with immutable prices and staff attribution.
- Treat counter-sale Vendor QR selection as display-only; vendor payouts are recorded separately to avoid accidental accounting links.
- Store optional delivery coordinates in each order's immutable address JSON snapshot, because a map pin belongs to that specific delivery rather than the customer's permanent profile.
- Expose only the connector's referrer-restricted Google Maps browser key through a server function; keep server-side Maps credentials private.
- Serve public shop settings through a server-side allowlist so private operational fields are never readable from the browser database client.
- Generate customer, staff, and counter-sale invoices through one shared paginated A4 PDF template so tax fields and print layout stay consistent.
- Keep homepage social links iframe-free and lazy-mounted below the primary shopping content so third-party media does not delay the storefront.
- Route every storefront brochure download through one shared validated enquiry dialog and send its fixed-recipient notification server-side.
- Control homepage showroom visibility through the shared shop settings record so staff changes apply consistently to the storefront.
- Persist post-checkout cart clearing immediately before navigation; keep debounced list syncing only for ordinary shopping-list changes.
- Read customer scooter bookings through authenticated owner-scoped access and keep public-token tracking as the booking detail path.
- Require sign-in for orders, keep guest browsing/carts, auto-release unpaid stock after 30 minutes, and reject late-payment revival.
