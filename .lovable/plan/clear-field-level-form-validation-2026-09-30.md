# Clear, field-level form validation

## Customer experience
- Add a consistent invalid state to text inputs, text areas, and dropdown triggers using the existing error color, with a visible border and focus ring in light and dark modes. Valid fields will remain visually unchanged.
- Show validation only after the first submit attempt. Mark every invalid field together, place a short message under each field, announce it through accessible field/message links, and focus plus scroll to the first invalid field.
- After the first attempt, revalidate edited fields immediately so each corrected field clears while unresolved errors remain.
- Keep a brief summary toast such as “Please fix 3 fields below”; inline messages become the primary guidance.

## Address and checkout forms
- Refactor the shared address validator to return errors by field while preserving its existing rules for name, primary and alternate phone, street, city, state, and PIN code.
- Extend the shared address fields to display and announce each field’s own error. Apply the behavior to both checkout and the account address dialog.
- Clear or recalculate address errors when customers select a saved address, choose a new address, edit a field, reopen the account dialog, or close it.
- Keep checkout delivery, payment, cart, coupon, saved-address, and order rules unchanged; the address step remains the only customer-entered required block in the checkout flow.

## Wholesale forms
- Add field-level validation to the customer wholesale application for business name, phone, alternate phone when entered, shop address, GSTIN when entered, business type, and monthly purchase estimate.
- Keep contact person, years in business, staff count, brands, categories, and all other currently optional fields optional.
- Add equivalent field-level validation to the staff “Add wholesaler” dialog for business name, phone, shop address, and an entered GSTIN, while preserving its existing approval controls.
- Make the GST certificate upload optional by changing the shared document definition and label. Keep the existing required-document filtering mechanism, historical document data, upload behavior, and all other server validation unchanged.

## Contact, bulk, and service forms
- Split contact-page name, phone, and optional alternate-phone failures into independent inline errors.
- Split bulk-enquiry name, phone, optional alternate phone, and requirement failures into independent inline errors. Allow submit attempts even when the requirement is empty so the inline error can be shown.
- Add the same post-submit behavior to service booking for the fields enforced today: name, phone, and an entered alternate phone. Keep date, slot, registration number, and issue rules unchanged.
- Preserve existing WhatsApp, enquiry-saving, service-booking, success, and server-error behavior.

## Technical details
- Use typed partial error maps and the existing `useState` approach; do not add a form library.
- Give each message a stable ID, pass it through `aria-describedby`, set `aria-invalid` only after submission, and maintain refs for deterministic first-error focus.
- Keep the current validators’ regexes and required/optional status unchanged except for the GST certificate upload.
- Record the cross-form validation convention in the project guidance and mark the task in the roadmap.

## Verification
- Add focused tests for address field maps, optional-field behavior, GSTIN handling, and the optional GST certificate definition.
- Verify checkout and account address forms: neutral initial state, all errors together, first-field focus, individual clearing, and PIN-only failure.
- Verify wholesale customer and staff forms, including required dropdown errors, optional years, malformed versus empty GSTIN, and no-document customer submission.
- Verify contact, bulk, and service booking independent errors and optional alternate-phone behavior.
- Check checkout and wholesale forms in light and dark modes, including `aria-invalid` and `aria-describedby`, on desktop and mobile; finish with focused tests and the preview build.
