# Wholesale Counter Sales

## Goal
Add a dedicated in-house sales workflow for Manager, Owner, and Super Admin users. It will create unpaid wholesale invoices for approved wholesale customers, reduce stock, and support later partial or full offline payments.

## User flow
1. Open **Counter Sales** from the manager menu.
2. Search and select an approved wholesale customer. Show their saved address, terms, current balance, credit limit, and overdue status as warnings only.
3. Search available products and build a sale. Default each line to the applicable wholesale price; allow a manager to change it only with a reason.
4. Choose **GST invoice** or **non-GST bill**. GST invoices use the current store rate and inclusion setting.
5. Review totals and create the sale. The system validates stock again, saves exact customer/product/price snapshots, reduces stock, creates an unpaid receivable, and records who created it.
6. Download or print the invoice immediately.
7. Record one or more offline payments with amount, method, reference, date, and note. Show paid amount, remaining balance, and payment history; mark the order paid only when fully settled.

## Access and safety
- Manager, Owner, and Super Admin can use Counter Sales; Staff cannot open it or call its actions.
- Only approved wholesale customers are selectable.
- Credit limits and overdue bills never block creation because these are handled manually offline; prominent warnings remain visible.
- Stock validation and sale creation happen atomically in the database to prevent overselling or half-created invoices.
- The existing online checkout and customer cart flows are not changed.
- Price overrides, sale creation, stock movement, payment entries, and cancellation are audit logged.
- Cancellation is allowed only before any payment; it restores stock and reverses the receivable exactly once.

## Data changes
- Add counter-sale metadata linked one-to-one with the existing order record.
- Add immutable counter-sale payment rows linked to the order.
- Add database functions for atomic sale creation, payment recording, and unpaid-sale cancellation.
- Keep standard order and order-item records so current order history and invoice generation continue to work.

## Interface
- Add `/manage/counter-sales` with three clear areas: customer, products/sale lines, and invoice summary.
- Add a paginated/searchable recent counter-sales list with status, total, paid, balance, invoice download, payment entry, and cancellation controls.
- Add the page to manager navigation and the signed-in profile menu for eligible roles only.
- Use responsive tables on desktop and stacked sale/payment rows on mobile.

## Verification
- Test route protection for Staff versus Manager.
- Create a wholesale sale with mock data and a deliberate price override.
- Verify GST and non-GST totals, stock reduction, invoice PDF, receivable creation, partial payment, final payment, and balance updates.
- Verify cancellation restores stock and is blocked after a payment.
- Check desktop and mobile layouts and confirm the preview build remains healthy.