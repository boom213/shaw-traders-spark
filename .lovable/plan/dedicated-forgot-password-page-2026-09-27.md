# Dedicated forgot-password page

## Goal
Move password-reset requests out of the sign-in card into a dedicated `/forgot-password` page matching the supplied two-column design.

## Changes
- Add a public `/forgot-password` page under the existing site header and footer.
- Build a responsive two-panel card:
  - Left: lock/refresh illustration, headline, supporting copy, and three security benefits.
  - Right: email form, send action, divider, and link back to `/account`.
- Reuse the existing password-reset request with `/reset-password` as the email return destination.
- Validate required and correctly formatted email addresses before submitting.
- Replace the form with a persistent, email-specific confirmation after success, with a “Use a different email” action.
- Change the account sign-in “Forgot password?” control into a link to `/forgot-password` and remove the old inline reset state and handler.
- Leave `/reset-password` unchanged.
- Add unique page metadata for the new route.

## Verification
- Confirm the account-page link opens `/forgot-password` without a full reload.
- Confirm empty and malformed emails show clear validation errors.
- Confirm a successful request shows persistent confirmation with the submitted email.
- Confirm “Use a different email” restores the form and “Back to Sign In” returns to `/account`.
- Check desktop and mobile layouts, type checks, and the preview build.
