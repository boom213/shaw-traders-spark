# Courier tracking link automation

## Goal
Replace routine courier-name and tracking-link entry with a courier picker and AWB-based link generation, without changing order status, notifications, customer tracking, or existing records.

## Courier registry
- Add one editable courier registry containing stable IDs, display names, and only verified direct tracking URL templates.
- Include the requested parcel and freight carriers. Carriers without a dependable public per-AWB URL remain selectable but have no generated link.
- Add a shared helper that matches courier names safely and URL-encodes the AWB.

## Manager order form
- Replace the courier-name field with a courier selector plus **Other**.
- Preserve unknown courier names by opening existing orders in **Other** mode.
- Show a read-only generated-link preview for supported couriers.
- Keep the optional tracking-link field editable as a manual override; existing saved links remain unchanged.
- Keep the section layout, save action, messages, and refresh behavior intact.

## Server safeguard
- When no tracking link is submitted, derive it again on the server before saving.
- Never replace an explicitly supplied link.
- Save no link for unknown couriers or carriers without a verified template, while still saving courier and AWB and marking the order shipped as before.
- Do not change notification code, permissions, validation, order lifecycle, customer pages, or database structure.

## Verification
- Add focused tests for matching, AWB encoding, unsupported carriers, unknown couriers, and manual-override precedence.
- Verify each included direct-link template reaches the courier's live official tracking experience; omit any uncertain template.
- Exercise supported courier, freight/no-link, **Other**, and pre-existing unknown-courier form states.
- Confirm saving still marks the order shipped, preserves notification behavior, and stores the expected URL or null.
- Run focused tests and confirm the preview build is clean.

## Technical details
- The registry is a browser/server-safe TypeScript module imported by both the order form and the server function.
- No migration, courier API, vendor account, settings screen, or edits to existing order records.
