# Shaw Traders EV — roadmap

## Done (final pass)
- Automated tests: payment signature checks, GST/COD/delivery rules, and live
  database tests for pricing, stock, the last-item race, coupons, paid/refund
  and release paths (39 tests, `bun run test`).
- SEO: sitemap.xml built from the catalogue (887 URLs) + robots.txt reference,
  Product / BreadcrumbList / LocalBusiness structured data, per-product
  database-driven titles, descriptions, canonical and share images.
- Performance: lazy below-the-fold images with fixed dimensions, hero preloaded,
  manager panel split out of the customer bundle, query caching tuned.
- Accessibility: skip link, single main landmark, visible focus rings,
  labelled controls, alt text on product images.
- Bengali and Hindi alongside English for the site's own wording.
- Installable app with offline browsing of pages and photos already viewed.
- Error reporting from customers' phones + /api/public/health uptime probe,
  surfaced in the manager overview.

## Done
- AI check of wholesale papers + staff AI panel and internal notes.

## Waiting on the owner
- Prices and stock for the catalogue (Stock & Photos / Price List).
- Razorpay keys for online payment.
- WhatsApp Business connection so order messages actually deliver.
- Registered business name, GSTIN and grievance officer details in Settings.
- An external uptime monitor pointed at /api/public/health.
