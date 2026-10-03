# Create the repository architecture guide

## Scope
- Add only `ARCHITECTURE.md` at the repository root.
- Document the verified TypeScript/Postgres ownership boundary, security rules, migrations, staff permissions, payment flows, and known maintenance traps.
- Keep the guide concise, practical, free of secrets and customer data, and under roughly 400 lines.

## Verification
- Derive all counts, routine names, paths, and migration references from the current repository.
- Confirm every referenced file exists and every stated count matches the current tree.
- Confirm the final change set contains only the new architecture document.
