# Replace Owner promotion with Staff/Manager role editing

## Staff Access page
- Remove every Owner-promotion control, dialog, state, mutation, and callback from the Staff Access page while retaining Owner audit display support.
- In the details drawer, show a Role selector only for eligible Staff and Manager accounts, with exactly Staff and Manager choices.
- Reset the selector to the opened person’s current role, disable Save until it changes, and keep Remove access unchanged below it.
- On a successful save, show “Role updated,” refresh the staff and audit lists, and close the drawer; keep it open and show the returned message on failure.

## Protected role update
- Add a Super Admin-only role-change action accepting only a valid profile ID and Staff or Manager.
- Reject self-changes and any attempt to change an Owner or Permanent Admin account.
- Replace the eligible account’s current role and record a `staff.role_changed` audit entry with the previous and new roles.
- Leave invitations, revocation, Owner promotion support, pagination, and activity filtering unchanged.

## Verification
- Confirm no Owner-promotion copy or control remains on the Staff Access page.
- Confirm eligible Staff/Manager drawers prefill the current role, Save enables only after a change, and Owner/Permanent Admin drawers omit the control.
- Test the guarded server behavior and verify the page builds cleanly.
