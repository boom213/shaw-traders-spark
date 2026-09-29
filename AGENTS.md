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
- Keep receipts auditable/non-overlapping; vendors are name-only collectors, optional links are atomic, and corrections never delete payments.
- Customers own saved addresses; checkout snapshots without silent overwrites.
- Expose only the restricted Maps browser key; keep server credentials private.
- Public settings use a server allowlist; never expose operations fields.
- Photos: 480px cards, 192px rows/PDFs, originals in details; retain PDF fallback/5s limit.
- Lazy-load iframe-free homepage social links below shopping content.
- All brochure downloads use one validated enquiry and fixed-recipient notice.
- Showroom visibility comes from shared shop settings.
- Clear carts before navigation; debounce only ordinary list sync.
- Bookings use owner-scoped reads and public-token tracking.
- Require sign-in for orders; keep guest carts; release unpaid stock at 30 minutes; reconcile Razorpay through signed idempotent callbacks and 90-second polling; quarantine late payments for audited resolution.
- Refresh manager data centrally; page by 8; aggregate in SQL; warn on schema drift.
- Online Sales gets server-enforced online-order-only access; online queries exclude `counter_sales.order_id` and Counter Sales stays separate.
- Keep the online-order index compact; full fulfilment, refund, and review controls live on its Manager detail route.
- Router events never mutate history/grid state; log errors. Use Spark loaders.
- Owner controls settings/reports/trade; audit grants; invite Online Sales/Staff/Manager.
- Reset requests use `/forgot-password`; recovery sessions set new passwords.
- Supplier purchases use a separate auditable, void-only ledger; never mix supplier payouts with customer QR collections.
- Wholesale reviews are manual and decisions atomic; never run AI document checks.
- Manager CSV exports use one BOM/CRLF utility, export filtered datasets up to 10,000 rows, require Reports permission server-side, and create audit entries.
