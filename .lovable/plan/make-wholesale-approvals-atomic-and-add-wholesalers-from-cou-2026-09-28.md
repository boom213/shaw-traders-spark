# Make wholesale approvals atomic and add wholesalers from Counter Sales

## Confirmed current state
- Wholesale approval currently updates the application first and the customer profile second, without checking either write result. A second-write failure can leave an approved application unavailable in Counter Sales.
- The live database has four such mismatches: the three named accounts plus Burdwan EV Garage. Per your decision, Burdwan will remain untouched.
- Counter Sales currently lists only profiles with active wholesale approval. Its customer section has no add-wholesaler action.
- The existing manual wholesaler form and creation logic already cover business details, tax validation, approval state, rate card, audit logging, and staff permissions.

## Implementation

### 1. Atomic wholesale decisions
- Add a service-only `decide_trade_application` database function that locks the application, validates the decision and rate card, and updates the application and linked profile in one transaction.
- For approval, set the profile to wholesale, apply the selected rate card and business name, and set the approval timestamp.
- For rejection or a document request, clear the profile approval timestamp while preserving the existing application decision fields.
- Make missing applications or failed profile updates raise an error so neither side can be saved alone.
- Change the existing server action to call this function, then retain the current audit entry and customer notification after a successful decision. Preserve the current idempotent response for an already-matching final decision.

### 2. Targeted one-time repair
- Repair only the three confirmed accounts: Zenitsu NEW, Zenitsu/YES, and Prema Gupta Shaw.
- Match the exact application/profile records rather than broad names or phone numbers, copy each approved application’s business name and requested rate card to its profile, and set its approval timestamp from the recorded decision time.
- Leave Shakti EV Wholesale unchanged because it is already consistent.
- Leave Burdwan EV Garage unchanged, as requested.
- Do not change shared-phone identity matching in this work.

### 3. Approval drift warning
- Add a protected check for approved wholesale applications whose linked profile is not fully approved or has inconsistent wholesale details.
- Show a destructive warning on Manager Overview and Trade & Credit with the affected business names and a clear message that they will not appear in Counter Sales until repaired.
- Keep this separate from the existing missing-database-items warning, and render nothing when no drift exists.

### 4. Add wholesaler inside Counter Sales
- Extract the existing manual wholesaler form into one shared manager component so Trade & Credit and Counter Sales use identical validation and behavior.
- Add an **Add wholesaler** action beside the Counter Sales customer search. Open the shared form in a responsive dialog without losing the sale in progress.
- Keep access to Manager, Owner, and Super Admin; Staff remains unable to create wholesale accounts.
- After creation, refresh the customer list. Auto-select an account created as approved; an account saved for a second check remains unavailable until approved.

## Technical notes
- Apply the database function through the schema migration workflow; perform the three-row repair as a separate, targeted data operation.
- Keep the function `SECURITY DEFINER`, lock down execution to the service role, and use the existing server-side staff authorization before calling it.
- Regenerate database types and record the atomic-approval decision in the project architecture notes.
- No changes to GST, pricing calculations, trade ledger behavior, invoices, shared-phone matching, or unrelated account data.

## Verification
- Confirm each decision updates the application and profile together for approval, rejection, and document-request states.
- Force the profile-update half to fail in a rolled-back test and confirm the application status also remains unchanged.
- Confirm the three repaired accounts appear by business name in Counter Sales with contact name and phone; confirm Shakti remains unchanged and Burdwan remains unavailable.
- Confirm the drift warning names a controlled mismatch and disappears after consistency is restored.
- As a Manager, add an approved wholesaler from Counter Sales, verify it becomes selected, and complete cleanup of the test account. Confirm Staff cannot access the action.
- Verify the shared form still works from Trade & Credit, then run focused tests, type checking, the preview build, and desktop/mobile browser checks.
