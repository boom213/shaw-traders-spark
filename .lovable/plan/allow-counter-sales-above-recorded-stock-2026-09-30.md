# Allow Counter Sales above recorded stock

## Goal
Let staff manually enter any whole-number quantity in **Counter Sales → Review items**, even when it exceeds the available stock. This exception applies only to Counter Sales.

## Changes
- Remove the available-stock maximum from the Counter Sales quantity field and plus control; keep the minimum at 1 and whole-number validation.
- Show a clear warning beside every over-stock line, including the available quantity and shortage amount.
- Show a summary warning before **Create unpaid sale** when one or more lines exceed stock. The sale remains allowed without an extra confirmation.
- Update the protected Counter Sales creation routine so it accepts excess quantities and reduces each product only to zero, never below zero.
- Record how much stock was actually deducted for each Counter Sales line. If an unpaid sale is cancelled, restore only that deducted amount, preventing the inventory count from being inflated.
- Keep normal retail checkout, wholesale pricing, invoices, credit ledger, GST, payment, and audit rules unchanged.

## Verification
- Test quantities below, equal to, and above available stock.
- Confirm excess sales retain the full invoiced quantity while product stock stops at zero.
- Confirm cancelling an unpaid excess sale restores only the stock that existed before that sale.
- Confirm ordinary online orders still reject quantities above stock.
- Check the Counter Sales warning and editable field on desktop and mobile, then confirm the preview build is clean.

## Technical details
- Add a migration that replaces `create_counter_sale` and `cancel_counter_sale` atomically and stores the actual deducted quantity on sale lines, with backward-compatible cancellation behavior for existing sales.
- Add focused database/function and interface regression tests.
