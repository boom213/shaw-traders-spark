# Tighten manager financial and owner access

## Access changes
- Make **Reports**, **Payment Reports**, and **Trade & Credit** visible and accessible only to Owner and Super Admin accounts.
- Keep all other role permissions unchanged.
- Ensure direct navigation is blocked by the same capability checks, not only hidden from the sidebar.

## Safer staff invitations
- Limit the regular invitation form to **Staff** and **Manager**.
- Enforce that restriction in the server-side validator so altered or replayed requests cannot invite an Owner.
- Use strict validation for the role, email, and name rather than silently converting an invalid role to Staff.

## Deliberate Owner promotion
- Add a separate **Grant Owner Access** action for existing Staff or Manager accounts.
- Show a confirmation dialog naming the selected person and explicitly listing Owner access: Site Settings, Domain Health, Brand Catalogue, Reports, Payment Reports, and Trade & Credit.
- Require Super Admin authorization again on the server, reject self-targeting and Super Admin targets, replace the existing role atomically, and write a distinct audit entry.
- Refresh the staff list after success while preserving the current invitation and revocation flows.

## Shubham’s account
- `shubhamguptaajinkya@gmail.com` is already a **Super Admin**, which is above Owner and already includes every Owner permission.
- Do not downgrade or duplicate that account’s role; keep it as Super Admin.

## Verification
- Test the capability matrix for Manager, Owner, and Super Admin roles.
- Confirm Managers cannot open Reports, Payment Reports, or Trade & Credit through direct URLs.
- Confirm the normal invite endpoint rejects Owner and malformed roles.
- Confirm Owner promotion requires confirmation, is Super Admin-only, updates an existing eligible staff member, and is audited.
- Confirm Shubham remains a Super Admin.
