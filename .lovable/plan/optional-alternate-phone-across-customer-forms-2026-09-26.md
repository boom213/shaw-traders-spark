# Optional alternate phone across customer forms

## Customer forms
- Add an **Alternate Number (optional)** field beside the primary phone field in:
  - checkout delivery address
  - Contact Us
  - Trade & Wholesale application business details
  - product availability enquiry
  - Bulk & Dealer Orders
  - new service booking only
  - scooter booking, test-ride, and finance dialogs
- Keep account login/mobile displays, manager search fields, existing-booking lookup, and grievance settings unchanged.
- Accept a blank alternate number. If entered, require a valid 10-digit Indian mobile number on both the page and server. Use numeric mobile input and clear inline/toast feedback consistent with each form.

## Saving and notifications
- Add a nullable `alternate_phone` field to orders, saved addresses, product enquiries, trade applications, vehicle bookings, service bookings, test-ride requests, and finance enquiries.
- Preserve the checkout number in the immutable order address snapshot and the order record; preserve it on a saved delivery address too.
- Pass the number through each existing validated submission function and include it in owner lead notifications when present.
- Save Contact Us and Bulk Orders as enquiry records with distinct `contact` and `bulk` sources before opening WhatsApp. Their WhatsApp message will include the alternate number when supplied.
- Do not add the field to the disabled exchange flow because it is not one of the three active scooter dialogs requested.

## Staff views
- Show `Alt: <number>` only when present, beside the existing primary phone in:
  - order details
  - enquiry list, including Contact and Bulk enquiries
  - trade application review
  - scooter booking and service/test-ride/finance lead details
- Existing records with no alternate number remain unchanged and show no empty label.

## Technical details
- Apply one additive database migration with nullable text columns; no existing data is changed or removed.
- Extend generated database types, server input validators, inserts/selects, and manager-view row types.
- Keep primary-phone validation unchanged. Normalize alternate numbers to digits and reject nonblank values unless they are 10 digits and begin with 6–9.
- Reuse `product_enquiries` for Contact and Bulk submissions, with nullable product linkage and descriptive product names/source values, so staff receives them in the existing Enquiries workspace without a parallel inbox.
- Update focused order, enquiry, trade, and vehicle-booking tests, then verify representative customer submissions and staff displays on desktop and mobile.
