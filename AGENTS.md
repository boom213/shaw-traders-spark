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

- All Products is Staff-read-only; Manager+ edits the catalogue.
- Keep receipts auditable; vendor links atomic; never delete payments.
- Customers own saved addresses; checkout snapshots without silent overwrites.
- Expose only the restricted Maps browser key; keep server credentials private.
- Public settings are allowlisted; never expose operations fields.
- Photos: 480px cards, 192px rows/PDFs; originals in details.
- Lazy-load iframe-free homepage social links below shopping content.
- Brochures download directly.
- Showroom visibility uses shared shop settings.
- Timestamp cart clears; retry catalogue reads; prune IDs only after success; block unresolved checkout.
- Bookings use owner-scoped reads and public tokens.
- Storefront browsing is public; only signed-in retail customers order online, while wholesale and staff use separate flows. Release unpaid stock at 30m.
- Refresh manager data centrally; page by 8; aggregate in SQL; warn on schema drift.
- Sales Manager gets server-enforced online-order-only access; online queries exclude `counter_sales.order_id` and Counter Sales stays separate.
- Keep the online-order index compact; full fulfilment, refund, and review controls live on its Manager detail route.
- Router events don't mutate state; log errors. Use Spark loaders.
- Owner controls settings/reports/trade; audit grants; invite Sales Manager/Staff/Manager.
- Reset requests use `/forgot-password`; recovery sessions set new passwords.
- Supplier purchases use a separate auditable, void-only ledger; never mix supplier payouts with customer QR collections.
- Wholesale reviews: manual/atomic, no AI; GSTIN not PAN; retain old PAN/export. Form errors: post-submit, per-field, accessible, live-clearing; focus first invalid.
- CSV exports use BOM/CRLF, filtered data capped at 10,000 rows, Reports permission, and audits.
- Razorpay review is Owner+ read-only. Counter Sales may exceed stock. Quote drafts submit atomically; rates stay private. PIs are not tax invoices and hide payment/rack data.
- Courier tracking URLs come from the shared verified registry; derive missing links server-side and preserve explicit staff overrides.
- Outreach is assisted manual WhatsApp work: server-controlled records may prefill text and links, but never auto-send or attach media.
- Showroom sales reuse vehicle_bookings; service-only SQL routines lock bookings for receipts, agreed-price revisions and handover so online token state stays untouched and receipt history cannot be deleted.
- Guest-reachable order/booking status or cancel server functions must match the record's `public_token`, never an id alone — ids leak in URLs and logs.
- Staff password sign-in and attempt logging run server-side (`staffPasswordSignIn`); allowlisted super-admin access requires a confirmed email — clients must not write auth records.
- No scheduled jobs (cost): expired unpaid reservations are released via `releaseStaleOrdersSoon` when cart/checkout/Manager orders load; reminders and the daily summary are Manager buttons. Any future cron route must use `authenticateCronRequest`, never the publishable key.
- CSV cells go through `csvCell`, which neutralizes leading formula characters — exports contain customer-typed text.
- `product_enquiries` and `stock_alerts` are written only by server functions (no anon/authenticated INSERT) — direct writes skipped validation and could flood the inbox.
- Server functions must check the `error` of every primary database write and return a failure (never `ok: true`) when it fails; only audit/event/notification logs may be best-effort — silent failures showed staff false "Saved" messages.
- Category labels on the storefront go through `useCategoryName` (optional `name_hi`/`name_bn`, falling back to `name`) — category names come from the database, not the translation file.
- Product names are unique ignoring case/spacing/punctuation (index `products_name_key_unique`); product saves map that error through `productSaveError` so staff see a clear message.
- Free-text search inside PostgREST `.or()` filters goes through `ilikeAny`/`safeSearchTerm` (`src/lib/postgrest-filter.ts`), never raw string interpolation — typed text could otherwise add or change filters.
- Email redirect targets built from request headers go through `trustedSiteOrigin` — an Origin header is attacker-controlled.
- Customers never insert `orders`/`order_items` directly (no INSERT grant/policy); orders come only from the checkout RPCs, and money/tier helpers (`trade_balance`, `trade_overdue`, `tier_price`, `customer_tier`) are service-role-only.
- Export CSV buttons take the page's `rowCount` and stay disabled until the list has rows (`canExportCsv`) — downloading an empty file confused staff.
- Only visitor-facing, read-only data may use the per-instance `createTtlCache` (currently the homepage feed, 30s); never cache reads that staff screens show after an edit, or "Saved" would look undone.
- The router dehydrates the per-request QueryClient into the page (src/router.tsx); server loaders must only cache public data — never per-user or staff data — because it is embedded in the HTML.
- Counter Sales product search reuses search_product_ids (categories, typos, vehicle models) plus plain name/SKU/brand/model/shelf matches, lists out-of-stock items after in-stock ones, and searches as staff type (250 ms pause).
- Counter Sales search shows the top 4 matches as a keyboard combobox (CounterProductSearch); suggestions appear only for results of exactly the typed text, so Enter never adds a stale item.

- Shop settings and header categories never throw: a failed read renders DEFAULT_SETTINGS (loadFailed) or an empty list, marked stale so the browser fetches them again; the settings read times out after 4 s. Why: the root loader runs on every page, so one failed read used to crash the whole site.

- SEO: product titles use productHeading (src/lib/seo.ts) so the shop's own brand is never repeated; categories with no visible parts are noindex and left out of sitemap.xml (same population as the category page: visible parts in that category); /account is noindex and not in the sitemap. Why: thin or private pages hurt search ranking.
