# Redesign Staff Access

## Compact staff management
- Keep the page limited to `/manage/staff` and its existing staff data functions; do not change other manager pages or any database schema.
- Keep the page heading concise and add a collapsible **Invite staff** panel for Super Admins only.
- Preserve Name, Email, and Staff/Manager role choices, use the existing styled selector, and keep the one-time password visible only until explicitly dismissed.
- Add desktop search, role, and sort controls; move role and sort into a bottom filter sheet on mobile.

## Paginated staff list
- Change the staff list function to accept search, role, sort, page, and page size, while retaining server-side Super Admin authorization.
- Fetch existing role/profile rows, deduplicate each person to their highest role before filtering, sorting, and slicing, then return `{ items, total }`.
- Show a compact desktop table and purpose-built mobile cards, both using the shared pager and existing loading, empty, error, and retry patterns.
- Display avatar initials, exact role labels, date added, current-user marker, and a subtle protected-account lock without inventing account statuses.

## Safe actions and details
- Replace inline row buttons with one accessible actions menu.
- Keep **Grant owner access** limited to Staff/Manager and preserve the existing confirmation wording and confidential-access list exactly.
- Add a confirmation before removing access, including the person’s name and email.
- Never show mutation actions for the current account or a Permanent Admin; retain every server-side self-action and role protection.
- Add a details drawer showing identity, role, date added, and permissions derived directly from `CAPABILITY_ROLE` plus `roleAtLeast`, with the same eligible actions at the bottom.

## Lazy, paginated activity history
- Put **Recent changes** in a collapsed-by-default accordion and fetch nothing until it opens.
- Extend the activity function with search, real entity-group filtering, date range, page, and page size; use database range/count pagination and retain the existing staff-management authorization.
- Render compact timeline rows with icons selected from the real action prefix, human-readable action text, and parsed actor name/email/role.
- Add independent activity filters, loading, empty, error, retry, and paging states.

## Technical details
- Reuse the installed dropdown menu, sheet, accordion, alert dialog, select, badge, skeleton, button, and shared `ListPager` components.
- Keep roles exactly `super_admin`, `owner`, `manager`, and `staff`; display `super_admin` as **Permanent admin** on this page.
- Preserve invitation, revocation, owner-promotion, temporary-password, and audit behavior; do not modify `requireStaff`, `logAudit`, table schemas, or unrelated permission rules.
- Keep all query keys parameterized so staff and activity pagination/filtering update independently and retain existing refresh invalidations.

## Verification
- Verify desktop and mobile layouts, including the mobile filter and details sheets.
- Confirm staff deduplication happens before filtering and pagination, and search/role/sort compose correctly.
- Confirm the activity request starts only after expansion and its search/group/date filters paginate accurately.
- Confirm current-user and Permanent Admin rows expose no rejected actions, and Staff/Manager invitations remain the only normal invite choices.
- Confirm owner promotion and removal dialogs, one-time password dismissal, loading/empty/error states, focused tests, and the preview build.
