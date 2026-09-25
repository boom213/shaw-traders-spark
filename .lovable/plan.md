# Scooter sample data and RTO-aware pricing

## What will change

- Add several clearly labelled sample scooter models so the admin Scooter Models page, public scooter list, and scooter detail flow can be tested immediately.
- Include varied examples: models requiring RTO registration and at least one low-speed model that does not require registration.
- Give each sample realistic specifications, colours, stock, warranty, booking token, and an itemised price. Keep the existing “Sample data” badge so customers and staff cannot mistake them for real inventory.
- When **Needs RTO registration** is unchecked in the admin form:
  - hide/disable the RTO charge input;
  - save the RTO amount as zero;
  - exclude RTO from the calculated customer price and booking snapshot;
  - omit the “RTO & registration” line from the customer-facing price breakdown.
- When registration is required, retain the current RTO charge and “we handle it” messaging.

## Validation and safeguards

- Enforce the rule on the server as well as in the form, so a modified browser request cannot attach RTO charges to a registration-free model.
- Keep existing scooter records and bookings unchanged; sample insertion will be repeat-safe and use unique sample SKUs/slugs.
- Verify both cases end-to-end: one registration-required model and one registration-free model, across admin editing, scooter details, displayed total, and booking creation.
- Check desktop and mobile layouts, current build status, and customer-facing metadata after the change.

## Technical details

- Reuse the existing `vehicle_specs.registration_required` flag; no new database structure is needed.
- Update the shared price-line helper and scooter detail usage so visibility follows the model specification.
- Normalize `vehicle_pricing.rto` to `0` during save when registration is not required; the database-generated on-road total will then remain correct everywhere it is reused.
- Insert the sample catalogue rows through the database data tool rather than a schema migration.
