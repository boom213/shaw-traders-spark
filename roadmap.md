# Shaw Traders EV — final pass

## Tests (first)
- [ ] Vitest setup
- [ ] Payment signature verification tests (checkout + webhook HMAC)
- [ ] GST / COD / delivery pure-logic tests
- [ ] Integration tests against create_order / mark_order_paid / release_order (stock, coupons, COD limit, oversell race)

## SEO
- [ ] /sitemap.xml from the database (products, categories, static pages) + robots.txt reference
- [ ] JSON-LD: Product on product pages, BreadcrumbList on category pages, LocalBusiness on home
- [ ] Canonical + DB-driven unique title/description per product and category
- [ ] og:image / twitter:image per product from the product photo (absolute URL)

## Performance
- [ ] Lazy-load below-the-fold images, explicit width/height, WebP
- [ ] Preload the home hero (LCP)
- [ ] Manager panel out of the customer bundle
- [ ] Query cache tuning for product/category

## Accessibility
- [ ] Keyboard nav, visible focus rings, labelled fields, alt text, AA contrast

## Also
- [ ] Bengali + Hindi alongside English
- [ ] PWA install + offline browsing of viewed products
- [ ] Error monitoring + uptime alerts
