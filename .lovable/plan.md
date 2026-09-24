# More business details on the wholesale application

The wholesale application stays one page. The existing fields and papers stay the same (business name, contact person, GSTIN, PAN, shop address, and the five documents). A new section, "About your business", goes above the papers.

## New questions
1. **Business type** (dropdown, required): Workshop / service garage, Spare-parts retailer, EV dealer / showroom, Fleet owner (e-rickshaw, delivery), Distributor, Other.
2. **Years in business** (dropdown): Under 1, 1–3, 3–5, 5+.
3. **Mechanics / staff** (dropdown): 1–2, 3–5, 6–10, 10+.
4. **Monthly purchase estimate** (dropdown, required): Under ₹25k, ₹25k–1L, ₹1–5L, ₹5L+.
5. **Scooter brands you service** (dropdown with checkboxes, pick many): brand list from the site's scooter picker, plus "Other".
6. **Parts you need most** (dropdown with checkboxes, pick many): the 14 shop categories (Batteries, Chargers, Motors, Controllers, and the rest).

The checkbox dropdowns show the picked items as small chips so the form stays short.

## Manager side
The Wholesale queue shows these answers on each application card, including a clear "₹1–5L / month" badge, so you can call the biggest buyers first and choose their price level. The owner's WhatsApp alert for a new application also includes the business type and monthly estimate.

## Not changed
Papers, approval steps, pricing, and the sign-in flow all stay as they are.

## Technical notes
- Migration: new columns on `trade_applications`: `business_type text`, `years_in_business text`, `staff_count text`, `monthly_volume text`, `brands text[] default '{}'`, `part_categories text[] default '{}'`. The existing grants and RLS already cover them.
- `submitTradeApplication` / `myTradeAccount` in trade.functions.ts validate and store them (allowed values only, arrays capped at 30). Business type and monthly estimate are required.
- New reusable `MultiSelectDropdown` built from the existing popover and checkbox pieces (added back if they were removed).
- Files touched: trade.tsx form, trade-admin.functions.ts and manage.trade.tsx display, trade-notify.server.ts message.
