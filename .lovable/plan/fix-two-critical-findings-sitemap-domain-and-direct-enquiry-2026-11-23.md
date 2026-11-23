# Fix two critical findings: sitemap domain and direct enquiry/alert writes

## 1. Point search engines at the real sitemap
- `public/robots.txt` line 22: change `https://shawtradersev.info/sitemap.xml` to `https://shawtradersev.com/sitemap.xml`. Nothing else in the file changes.
- After you publish, resubmit `https://shawtradersev.com/sitemap.xml` in Search Console (through the connected Google account if one is linked, otherwise I explain the one manual step).

## 2. Close direct writes to enquiries and stock alerts
Checked: the website saves enquiries, WhatsApp enquiries and "notify me" alerts only through the server (admin client in `enquiries.functions.ts`, `whatsapp-inbound.server.ts`, `shop-extras.functions.ts`). The live database still has an open insert rule on both tables ("Anyone can ask about availability", "Anyone can ask to be told when stock returns"; currently scoped to signed-in users) plus insert permission for visitors.

New migration:
- Drop both insert policies (`DROP POLICY IF EXISTS`).
- `REVOKE INSERT ON product_enquiries, stock_alerts FROM anon, authenticated`.
- Keep staff read/update rules and `service_role` access unchanged, so the server and Manager screens work as before.

## 3. Tests
- New test in `tests/`: a visitor (publishable key) and a signed-in customer each try to insert into both tables and are refused; the row never appears (checked via admin, cleaned up regardless).
- Re-run the existing enquiry / stock-alert server tests to confirm the website forms still save.
- Record the rule in `AGENTS.md`: these tables are written only by server functions.
