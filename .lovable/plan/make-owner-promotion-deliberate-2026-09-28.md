# Make Owner Promotion Deliberate

## Staff quick actions
- Remove **Grant owner access** from every row and mobile-card actions menu.
- Keep only **View details** and, for eligible accounts, the existing destructive **Remove access** action.
- Remove the now-unused owner callback from the quick-action component and its row/card props.

## Staff details
- Keep **Grant owner access** available only inside the person’s details drawer for eligible Staff and Manager accounts.
- Add a short explanation of the confidential areas Owner access unlocks.
- Visually separate Owner promotion from the existing **Remove access** button while preserving both confirmation dialogs and handlers.

## Scope and verification
- Change only `src/routes/manage.staff.tsx`; retain the Crown icon where details and activity history still use it.
- Verify desktop and mobile action menus, the details drawer, existing eligibility rules, confirmation flow, and the preview build.
