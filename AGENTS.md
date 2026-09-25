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

- Keep the all-staff product directory separate from catalogue editing so operational roles receive read-only access without catalogue write permissions.
- Model in-house wholesale sales as dedicated counter-sale records linked to orders, with immutable price snapshots and separate payment entries, so online checkout behavior stays unchanged and partial payments remain auditable.
- Store optional delivery coordinates in each order's immutable address JSON snapshot, because a map pin belongs to that specific delivery rather than the customer's permanent profile.
- Expose only the connector's referrer-restricted Google Maps browser key through a server function; keep server-side Maps credentials private.
- Serve public shop settings through a server-side allowlist so private operational fields are never readable from the browser database client.
- Generate customer, staff, and counter-sale invoices through one shared paginated A4 PDF template so tax fields and print layout stay consistent.
