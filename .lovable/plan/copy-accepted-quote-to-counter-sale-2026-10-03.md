# Copy accepted quote to Counter Sale

## Goal
Let a Manager or higher open an accepted wholesale quote, copy it into Counter Sales, review the customer, quantities, and quoted rates, then create the unpaid sale through the existing workflow.

## What will change
- Add **Copy to counter sale** beside **Download PI** on accepted quotes only.
- Open Counter Sales with the quote reference in the URL; ordinary Counter Sales links remain unchanged.
- Load the accepted quote through a protected server function using the Counter Sales permission.
- Rebuild each cart line from the current product record and the quote customer’s actual price tier, while keeping the quote’s quantity and agreed unit price.
- Preselect the quote customer and prefill the audit reason with the quote number.
- Show a persistent warning panel for every line that could not be copied because its product was deleted, its price is missing, or its current product record is unavailable.
- If a Counter Sales cart already contains items, require explicit confirmation before replacing it.
- Remove the quote reference from the URL after a successful import so refresh cannot import it again.
- Keep final sale creation manual; invoice type, product search, edits, stock warnings, payments, and existing Counter Sales behavior stay unchanged.

## Safety rules
- Only quotes with status **accepted** can be copied, even if their original expiry date has passed.
- Invalid or malformed quote links load Counter Sales normally without changing the cart.
- No quote line is omitted silently.
- No database migration, dependency, quote-pricing change, or automatic sale creation.
- Phase 2 quantity editing and customer send-back are excluded.

## Technical details
- Add `counterSaleDraftFromQuote({ quoteId })` in the existing quote server-functions module.
- Validate the quote UUID and enforce the `counter-sales` capability before reading billing data.
- Fetch the quote, its items, its customer tier, and current products through the private server path; construct the same `CounterProduct` pricing/image/rack shape used by Counter Sales search.
- Add optional `quote` search validation to `/manage/counter-sales` and use replace navigation when clearing it.
- Add focused tests for accepted-status enforcement, permission usage, current-product reconstruction, skipped-line reporting, optional search handling, quoted-price preservation, and the existing navigation links.

## Verification
- Run focused quote and Counter Sales tests, then the full test suite and project type check.
- Browser-test accepted and non-accepted quote actions, quoted-price and tier baselines, cart replacement cancel/confirm, skipped products, refresh safety, malformed links, ordinary Counter Sales entry, and Manager-only access.
- Create one real test Counter Sale only if a suitable accepted quote is available; verify its saved price-override reason names the source quote and clean up only through the existing audited controls where possible.
