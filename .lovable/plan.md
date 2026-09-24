# Finish the trade sign-up wording and auto-fill

Most of what was suggested for the trade page is already done: "Mobile verified" is gone, step 1 says "Sign in to apply" (mobile or Google), and step 2 shows "Signed in as ..." with the customer's email or number.

## What's left
1. **Fill in the mobile number automatically:** if the customer signed in with a mobile code, the "Mobile number" box on the form starts with that number, written as 10 digits. They can still change it. Google users type theirs in, the same as now.
2. **Mobile number check on the form:** the box only accepts digits, up to 10. A red message appears if the number isn't 10 digits or doesn't start with 6 to 9, the same rules as the sign-in box, and the application won't send until it's fixed.
3. **Clearer step 2 line:** "Step 2 of 2 · Signed in as ... — business details and papers", so it says what to do next.

## Not touched
Sign-in itself, what gets saved, the manager panel, and prices.

## Technical notes
- In `src/routes/trade.tsx`, when there's no saved application and `user.phone` exists, set `form.phone` to the last 10 digits (`user.phone.replace(/\D/g, "").slice(-10)`). Add a `phoneErr` check to the `submit` guard.
