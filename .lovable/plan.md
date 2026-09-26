# Add Change Password to the account page

## Scope
- Show a **Change password** form inside the signed-in account details area only when the account's provider list includes `email`.
- Keep Google-only and phone-only accounts unchanged, with no password controls shown.
- Add current password, new password, and confirmation fields using the account page's existing inputs, labels, buttons, loading indicator, and card styling.

## Behavior
- Validate that an email is available, the new password has at least 8 characters, and confirmation matches.
- Re-authenticate with the current password before attempting the update.
- Update the password only after successful re-authentication.
- Show clear failure messages for an incorrect current password or an unsuccessful update.
- On success, show “Password updated” and clear all password fields.

## Verification
- Confirm email-password accounts see the form and provider-only accounts do not.
- Check mismatch, short-password, wrong-current-password, loading, and success behavior.
- Confirm the account page builds cleanly.
