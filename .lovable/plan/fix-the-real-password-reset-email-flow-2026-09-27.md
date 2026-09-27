# Fix the real password-reset email flow

## What will change
- Update the reset-password page to check the already-established recovery session even when the one-time token has been removed from the address after successful verification.
- Accept that session only when the account has a recent password-recovery request, so an ordinary signed-in visit cannot open the reset form.
- Keep the existing live recovery-event handling and expired, invalid, and direct-visit messages.

## Verification
- Create a fresh temporary staff account using a Gmail alias.
- Request the reset email from the live website and open the genuine delivered link.
- Confirm mismatched passwords are rejected, matching new and confirm passwords succeed, and the new password signs in.
- Remove temporary staff access after testing.
