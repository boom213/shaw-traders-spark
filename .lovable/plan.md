# Stop collecting PAN in wholesale applications

## Goal
Remove PAN collection and validation from both customer and staff wholesale forms without changing or deleting historical PAN records.

## Changes
- Make the shared tax-ID validator check only an optional GSTIN; malformed GSTIN values will still be rejected.
- Remove PAN from the customer wholesale form, its saved form state, explanatory copy, and new submission payload.
- Remove PAN from the staff “Add wholesaler” form and new account payload while keeping the remaining fields aligned.
- Preserve the existing database column, historical PAN return types, manager CSV column, and stored values.
- Show PAN in manager review only when an older application actually contains one.
- Add focused regression tests covering empty, valid, and malformed GSTIN behavior, plus source safeguards for historical PAN retention.
- Update the project task list and permanent project requirement.

## Technical details
- No database migration or data update.
- Keep `PAN_RE`, `PAN_ERROR`, `pan_card_path`, document uploads, approvals, tiers, credit limits, and payment terms unchanged.
- Verify all tax validator calls use the new one-argument signature, run focused tests, inspect the preview build status, and check both affected forms in the browser where access permits.
