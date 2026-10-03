# Staff Outreach List

## Goal
Add a staff-only `/manage/outreach` page where staff can upload a CSV contact list, work through contacts, open a pre-filled WhatsApp conversation, and record opened or skipped contacts.

## What will be built

### 1. Secure outreach records
- Add `outreach_lists` and `outreach_contacts` with the requested fields, status rules, list/status index, explicit grants, and staff-only read policies.
- Keep all writes server-controlled; there will be no browser insert, update, or delete policies.
- Add a service-only transactional database function so a validated list and all accepted contacts are created together or not at all.
- Use migration `0069`, because the repository already contains migration `0068`.

### 2. CSV upload and validation
- Accept CSV only, with case-insensitive `name`, `phone`, `message`, and optional `link` headers in any order.
- Reuse the existing quoted-CSV parsing approach and the existing Indian WhatsApp number normalizer.
- Require phone and message values, validate optional links, cap processing at 5,000 data rows, and keep the first occurrence of each normalized phone.
- Return an upload summary with imported count, rejected row numbers and reasons, and duplicate count.

### 3. Staff-controlled actions
- Add protected server functions for upload, list summaries, paginated/searchable contacts, idempotent “opened” marking, skipped marking with a required short reason, and confirmed list deletion.
- Require the existing `operations` permission for every function before using privileged database access.
- Record meaningful create, status-change, and delete actions in the existing audit history without storing message text in audit details.

### 4. One-page staff workflow
- Add the Outreach entry to the manager sidebar, mobile manager menu, and account menu near Customers.
- Default view: CSV-only upload, optional list label, list date, total, and sent progress.
- Working view: pending/sent/skipped counters, default pending filter, name/phone search, eight-row pagination, message preview, status, Send, and Skip.
- Send opens `wa.me` in a new tab with the encoded message and optional URL on its own line, then marks the row as opened. The page will clearly state that staff must still press Send in WhatsApp.
- Skip collects a short reason in an accessible dialog. List deletion requires explicit confirmation.
- Use the existing design tokens, buttons, inputs, selects, loaders, and responsive table patterns.

## Technical details
- No WhatsApp API, automated sending, bulk-send action, templates, scheduling, image upload, Excel parser, or new dependency.
- No changes to catalogue import, notifications, or the WhatsApp helper.
- Add route-specific title, description, Open Graph metadata, Twitter card, and `noindex`.
- Add focused tests for CSV parsing, phone normalization outcomes, deduplication, 5,000-row cap, permission mapping, WhatsApp link composition, and status semantics.
- Update the project roadmap and architecture rules for the new manual-outreach boundary.

## Verification
- Apply the schema migration and confirm generated database types refresh.
- Run focused tests, the full test suite, and inspect the latest preview build diagnostics.
- Browser-test with a five-row CSV containing one invalid phone and one duplicate: confirm three imports, accurate summary, counters, search/filter/pagination, Send/new-tab behavior, idempotent re-click, appended product link, Skip reason, reload persistence, and confirmed deletion.
- Verify plain Staff can access the page and menu entry, while a signed-in non-staff customer cannot read or write outreach records.
