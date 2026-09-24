# Account discoverability and wholesale funnel

## 1. Header sign-in label (Header.tsx)
- The account icon link gets a visible text label from `sm` and up: "Sign In" when signed out, the saved name or "Account" when signed in (uses `user` from `useStore()`).
- Narrow phones keep the icon only. Touch target stays at least 40px.

## 2. Home page "For owners / For workshops" section (index.tsx)
- The "Explore Shaw Traders EV" 7-card link grid is no longer on the home page (it was removed in the earlier structure pass). So nothing gets replaced: the new two-card section goes directly after "Shop by Category". To keep the page from getting longer, I'll fold the standalone "Need EV Parts in Bulk?" dark banner at the bottom into the workshop card, since both say the same thing.
- Left card, "For EV Owners & Riders": order tracking, save your scooter for 1-tap fitment, WhatsApp order updates. Button "Sign In / Join" goes to /account.
- Right card, "For EV Workshops & Mechanics": wholesale pricing, GST invoices, credit terms (wording copied from /trade's description). Button "Apply for Trade Account" goes to /trade. A small "one-off bulk order? Request a quote" link goes to /bulk.
- Cards use the same style as the rest of the page (`rounded-2xl border`, `shadow-[var(--shadow-card)]`). They stack on phones.

## 3. Account page (account.tsx, AuthPanel)
- a) On the mobile-number step only, a helper line under the field: "New number? We'll automatically create your account."
- b) Below the form, an "or" divider and a "Continue with Google" button that calls `lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/account" })`. It shows a toast on error, does nothing extra if the page redirects, and the session updates the store when tokens come back. Google sign-in gets switched on in the backend in the same step so it works straight away.
- c) Below that, a callout: "Garage, mechanic, or fleet dealer? Looking for trade pricing and bulk order terms?" with a link to "Register for a Trade & Wholesale Account" at /trade.

## Not touched
The code-verification logic, the /trade page, cart and checkout. The account page stays a normal page, not a popup.

## Technical notes
- /account is a public route, so the OAuth redirect to it is allowed.
- The Google provider is set up with the social-login configuration tool. No files under src/integrations/lovable are edited.
