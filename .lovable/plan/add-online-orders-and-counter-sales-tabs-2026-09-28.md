# Add Online Orders and Counter Sales tabs

## What will change
- Add a compact two-tab switcher at the top of the order-management area:
  - **Online Orders** → `/manage/orders`
  - **Counter Sales** → `/manage/counter-sales`
- Show the same switcher on both pages, with the current page clearly selected.
- Use real page links so browser back/forward, refresh, bookmarks, and existing URLs continue to work.
- Keep the tabs full-width and easy to tap on narrow screens without overflowing.

## What stays unchanged
- Keep the existing Online Orders search, filters, fulfilment, payment-review, refund, tracking, and invoice actions unchanged.
- Keep the existing Counter Sales creation, invoices, stock handling, credit ledger, and offline-payment actions unchanged.
- Keep both existing sidebar links and all current role permissions unchanged. Staff who cannot access Counter Sales will not be given an unusable Counter Sales tab.
- No database or accounting changes.

## Technical details
- Create one small shared order-type navigation component using the existing tab styling and typed router links.
- Render it above the current content in both order pages.
- Determine visibility from the signed-in staff role and the existing `counter-sales` capability check rather than duplicating permission rules.

## Verification
- Confirm **Online Orders** is selected at `/manage/orders` and **Counter Sales** is selected at `/manage/counter-sales`.
- Confirm switching tabs preserves the correct URL and page content.
- Check Manager access on desktop and mobile, plus Staff behavior where Counter Sales is restricted.
- Confirm the app still builds cleanly.
