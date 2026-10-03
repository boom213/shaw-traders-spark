# Outreach CSV template

## Build
- Add an outline **Download CSV template** button beside the existing CSV picker.
- Generate `outreach-template.csv` entirely in the browser with a UTF-8 BOM, CRLF line endings, exact supported headers, and three fictional examples.
- Escape CSV fields correctly, including the example message containing a comma.
- Expand the helper text with required/optional columns, flexible column order, per-row personalization guidance, and the `https://` link rule.

## Preserve
- Keep the existing upload, parser, WhatsApp send flow, permissions, and page layout unchanged.
- Add no server work, database changes, dependencies, or Excel writer.

## Verify
- Test the downloaded filename and contents, parser round-trip, linked WhatsApp message, non-ASCII names, missing-column error, and the full test suite.
