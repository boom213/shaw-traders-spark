# Proforma Invoice PDFs for Priced Wholesale Quotes

## Goal
Let approved wholesale customers and authorized managers download a priced, unexpired quote as a professional Proforma Invoice, while preserving every existing order, counter-sale, and staff invoice exactly as it works today.

## Implementation
- Extend the shared PDF document model with an optional document type, validity date, and note. The existing default remains a tax invoice.
- Reuse the current PDF renderer, making only its title, reference label, legal note, payment/details block, metadata, and filename conditional for a Proforma Invoice.
- For a PI, show **PROFORMA INVOICE**, **Quote No.**, the validity date, and “This is not a tax invoice”; omit all payment-status wording and warehouse rack locations.
- Keep the existing invoice layout, logo, fonts, item table, pagination, GST summary, and tax-invoice output unchanged.

## Quote GST
- Add optional `gst_rate` and default-false `gst_included` fields to wholesale quote requests in one additive database migration.
- Add an optional GST rate and inclusive/exclusive selector beside the required expiry date on the manager pricing screen. Blank or zero GST means “Quoted without GST.”
- Save GST settings before invoking the existing pricing operation. Do not alter or overload the protected pricing function.
- Calculate taxable value, GST, and final total consistently for inclusive and exclusive prices so a later invoice cannot disagree with the PI.

## Secure PDF downloads
- Add one shared quote-to-PDF wrapper that loads the quote, item snapshots, business settings, HSN codes, and the customer’s approved wholesale application.
- Map the wholesale business name, flat shop address, phone, and GSTIN into the structured bill-to details expected by the PDF renderer; fall back to profile details when needed.
- Continue rendering deleted products from their saved item name and default HSN.
- Refuse PDFs for awaiting-rate, rejected, or expired quotes.
- Add separate server actions:
  - customer action: confirms the signed-in approved wholesale account owns the quote;
  - staff action: requires the existing Manager+ quote permission.

## Download actions and translations
- Show **Download PI** in **My quotes** only for priced or accepted, unexpired quotes.
- Show the same action on eligible records in **Wholesale Quotes** for authorized staff.
- Download as `Proforma-<quote-number>.pdf` using the existing browser PDF helper.
- Add English, Bengali, and Hindi labels, including “Proforma invoice — not a tax invoice.”

## Verification
- First regression-test standard order, counter-sale, and internal staff invoices for unchanged TAX INVOICE headings, metadata, filenames, calculations, and staff-only details.
- Add PDF tests for proforma headings, Quote No., validity, no-payment wording, non-tax wording, no-GST and inclusive/exclusive GST arithmetic, pagination, and deleted-product fallback.
- Verify the bill-to block visibly contains the wholesale business name, shop address, and phone, with no rack location anywhere.
- Verify customer ownership isolation, Manager+ access, refusal of awaiting/expired quotes, and refusal of direct customer access to the pricing function.
- Confirm the pricing function still has exactly one five-argument signature and remains executable only by the private server role.
- Exercise both customer and manager downloads in the preview, including Bengali and Hindi labels, then run focused quote/invoice tests and confirm the preview build is clean.

## Technical details
- Current database checks confirm the two GST fields do not yet exist, and `price_quote_request(uuid,jsonb,timestamptz,text,text)` currently has one securely restricted signature.
- The schema change will use the next available migration and regenerate database types automatically.
- Record the PI security and document-legality rule in the project architecture guidance and mark the roadmap item complete.
