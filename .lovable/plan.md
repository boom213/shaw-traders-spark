# Make cart clearing survive refresh reliably

## Goal
Keep a deliberately cleared cart empty after refresh, sign-in synchronization, checkout completion, and activity in another tab, while preserving wishlist and saved-for-later items.

## Confirmed cause
- The latest saved cart record can contain both a clear timestamp and old cart lines; the current merge accepts those lines when the local and saved clear timestamps are equal.
- On refresh, the upload effect can become eligible as soon as the account is detected, before the initial saved-cart download and merge has completed.
- Cancelling a delayed upload does not protect against an upload that has already started.

## Changes
- Treat an empty cart with an equal-or-newer clear timestamp as authoritative, so stale lines carrying the same timestamp cannot return after refresh.
- Hold all uploads until the signed-in customer's initial saved-cart read and merge finishes successfully; do not interpret a read error as an empty account record.
- Serialize cart writes so a deliberate clear is queued after any already-started write and remains the final saved state.
- Keep the immediate browser clear, cross-tab update, coupon clearing, guest-cart behavior, wishlist, saved items, and normal cart merge behavior unchanged.
- Surface sync failure through the existing warning path without restoring items locally.

## End-to-end verification
- Add regression tests for equal clear timestamps, refresh-before-initial-sync, and an in-flight stale write followed by clear.
- Retain tests for guest/account merging, quantity merging, saved items, wishlist, checkout success, payment cancellation, and cross-tab timer cancellation.
- In a signed-in retail browser session: add a real product, clear the cart, refresh immediately, wait beyond the sync delay, refresh again, and confirm the cart stays empty locally and in the saved account record.
- Repeat across two tabs and verify successful COD/confirmed-payment completion clears the cart while failed or cancelled payment leaves it intact.
- Run focused tests, type checks, and confirm the preview build is healthy.

## Technical scope
Frontend cart synchronization and focused tests only. No product, order, payment, stock, or delivery records will be changed.
