# Allow managers to add products

## Outcome
Managers, owners, and super admins can add catalogue products from **Products & Stock**. Regular staff remain read-only through **All Products**.

## Changes
- Show the **Add product** action to manager-level roles and above.
- Change the protected product-creation action from super-admin-only to the existing catalogue permission, so hiding the button is not the only protection.
- Preserve the current product form, validation, photo upload, wholesale pricing, and audit entry.
- Keep permanent product deletion restricted to super admins.

## Verification
- Confirm a manager can see the action and create a draft product.
- Confirm the created product and audit record identify the manager.
- Confirm regular staff cannot access the catalogue route or invoke product creation.
- Confirm deletion remains unavailable to managers and owners.
- Run the relevant role tests and check current diagnostics.

## Technical details
The existing `catalogue` capability starts at manager level and already protects catalogue reads and edits. Product creation will use that same server-side capability instead of a separate super-admin requirement.
