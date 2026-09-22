# Shaw Traders EV — move off localStorage

- [ ] Migration: order public_token + contact_phone, user_lists mirror, place_order RPC with stock enforcement
- [ ] Regenerate database types
- [ ] Enable email/password + Google sign-in
- [ ] Public read layer (catalog server fns, publishable client)
- [ ] Manager read/write layer (manage session gated, admin client)
- [ ] Order lookup server fns (token + phone last-4 or signed-in profile or manager)
- [ ] useStore: cart/wishlist/saved/recent only, mirrored to DB when signed in
- [ ] Rewrite routes: index, shop, category, product, offers, find-parts, cart, checkout, track, order, account, manage.*
- [ ] Skeletons + empty states, SSR meta/canonical from DB
- [ ] Stock checks at add-to-cart and checkout
