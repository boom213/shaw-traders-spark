# Prevent reset-link recovery from getting stuck

## Goal
Make valid email password-reset links reliably show the new-password form, including on a fresh page load when the recovery event fires before the page subscribes.

## Changes
- Keep the existing recovery-event listener in `/reset-password`.
- When the URL contains a recovery token, also check the already-established authentication session once.
- Mark the link ready when either the existing session check or the live recovery event succeeds.
- Prevent late asynchronous results from changing state after the customer leaves the page.
- Preserve the current expired-link, invalid-link, and direct-visit states.

## Verification
- Confirm a recovery URL with an existing session opens the password form without waiting indefinitely.
- Confirm a live `PASSWORD_RECOVERY` event still opens the form.
- Confirm direct visits still show the inactive-link message and invalid links keep their specific guidance.
- Run focused checks and confirm the preview build is clean.
