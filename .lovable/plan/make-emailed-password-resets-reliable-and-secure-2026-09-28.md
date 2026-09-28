# Make emailed password resets reliable and secure

## Changes
- Remove the browser-side `recovery_sent_at` check because that field is unavailable there.
- Keep explicit expired and invalid-link handling unchanged.
- Add a protected server check that verifies the signed-in account has a recent password-recovery request.
- Keep the live `PASSWORD_RECOVERY` event as the immediate success path.
- Accept a recovered session after the email link has been consumed, while preventing an ordinary signed-in account from opening the reset form.

## Verification
- Use a temporary staff account and a fresh Gmail alias.
- Open the genuine delivered reset link and confirm the new-password form appears.
- Confirm mismatched passwords fail, matching passwords succeed, and the new password signs in.
- Confirm a normal signed-in visit and a signed-out direct visit cannot access the reset form.
- Remove the temporary staff account after testing and confirm the preview is clean.
