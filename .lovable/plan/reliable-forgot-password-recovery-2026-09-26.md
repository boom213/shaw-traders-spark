# Reliable forgot-password recovery

## Goal
Make password-reset requests visibly confirmed and ensure valid email links are recognized without a timing race.

## Changes
- In the account sign-in area, add a dedicated reset-request confirmation state after the email request succeeds.
  - Keep the confirmation visible until the customer leaves or chooses “Back to sign in.”
  - Show the submitted email address in the confirmation.
  - Keep the existing non-disclosing request behavior and success toast.
  - Keep sign-up email confirmation separate from password-reset confirmation.
- On the reset-password page, replace the mount-time session decision with recovery-event handling.
  - Subscribe to authentication changes before deciding whether a recovery link is ready.
  - Enable the password form only after the `PASSWORD_RECOVERY` event.
  - Clean up the subscription when leaving the page.
  - Show a brief checking state while a recovery link is being processed, avoiding a false “inactive” flash.
- Parse recovery errors from both the URL query and hash.
  - Show an expired-link message for `otp_expired`.
  - Show the returned safe description for other invalid-link errors, with an action to request another link.
  - Reserve the existing inactive-link message for direct visits with no recovery token or error.

## Verification
- Requesting a reset with no email still asks for an email first.
- A successful request replaces the sign-in form with persistent email-specific confirmation; returning restores sign-in.
- Direct `/reset-password` visits show the no-link state.
- Simulated expired and invalid link URLs show the correct specific state.
- A recovery event reveals the new-password form without a race or inactive-state flash.
- Run focused type checks and confirm the preview build is clean.
