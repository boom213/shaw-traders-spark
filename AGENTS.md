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
- Keep receipts auditable; vendor links are atomic and corrections never delete payments.
- Customers own saved addresses; checkout snapshots without silent overwrites.
- Expose only the restricted Maps browser key; keep server credentials private.
- Public settings use a server allowlist; never expose operations fields.
- Photos: 480px cards, 192px rows/PDFs, originals in details; retain PDF fallback/5s limit.
- Lazy-load iframe-free homepage social links below shopping content.
- All brochure downloads use one validated enquiry and fixed-recipient notice.
- Showroom visibility comes from shared shop settings.
- Clear carts before navigation; debounce only ordinary list sync.
- Bookings use owner-scoped reads and public-token tracking.
- Retail-only online ordering; keep guest carts; wholesale/staff use separate flows; release unpaid stock at 30m; reconcile Razorpay via signed callbacks and 90s polling; quarantine late payments.
- Refresh manager data centrally; page by 8; aggregate in SQL; warn on schema drift.
- Sales Manager gets server-enforced online-order-only access; online queries exclude `counter_sales.order_id` and Counter Sales stays separate.
- Keep the online-order index compact; full fulfilment, refund, and review controls live on its Manager detail route.
- Router events never mutate history/grid state; log errors. Use Spark loaders.
- Owner controls settings/reports/trade; audit grants; invite Sales Manager/Staff/Manager.
- Reset requests use `/forgot-password`; recovery sessions set new passwords.
- Supplier purchases use a separate auditable, void-only ledger; never mix supplier payouts with customer QR collections.
- Wholesale reviews are manual and decisions atomic; never run AI document checks.
- CSV exports use BOM/CRLF, filtered data capped at 10,000 rows, Reports permission, and audits.
- Razorpay review is Owner+ read-only, server-side, and never changes money or stock.
