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
