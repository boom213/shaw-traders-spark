# AI document check and staff review for wholesale applications

## What already exists
- Applicants already attach 5 papers on the trade page (GST certificate, shop photo, address proof, PAN card, trade licence/Udyam).
- The manager panel's Wholesale tab already lists applications and opens each paper. Staff can approve, reject or ask for a document there. The note typed there is sent to the customer.

## 1. AI check of each paper (applicant side)
- After a paper is attached, the site reads it with AI and pulls out the key details:
  - GST certificate: GSTIN, legal name, address
  - PAN card: PAN, name
  - Address proof: name, address
  - Shop photo: whether a signboard is visible, and the name on it
  - Trade licence/Udyam: registration number, name
- A small status sits under each paper: "Looks good", "Unclear — please upload a sharper photo", or "Doesn't match". For example, the PAN on the card differs from the PAN typed in the form, or the GSTIN differs.
- Also shown: "Missing: GST certificate" style hints for required papers not yet attached.
- These are advice only. The applicant can still send the application, so a wrong AI reading never blocks a real customer.

## 2. Staff review screen (manager panel, Wholesale tab)
- Each application card gets an **AI check** panel with what was read from every paper, the flags (missing, unclear, mismatched), and a "Re-run check" button.
- **Internal notes:** a separate box, visible to staff only, with a running list showing who wrote each note and when. The existing customer-facing note stays as it is.
- Filters stay the same (Waiting / Asked for papers / Approved / Rejected / All). A "Has AI flags" badge on a card lets staff spot problem applications quickly.
- Approve, reject and ask for a document work as they do now.

## Not touched
Sign-in, pricing, credit terms, and the customer-facing decision note.

## Technical notes
- New table `trade_doc_checks` (application_id, field, status ok|unclear|mismatch|error, extracted jsonb, issues text[], checked_at), with a unique key on (application_id, field). New table `trade_internal_notes` (application_id, author_id, body, created_at). Grants + RLS: applicants read their own checks; staff (`has_role`) read and write both; the applicant can never read notes.
- Server function `checkTradeDocument` (`src/lib/trade-ai.functions.ts`): verifies the caller owns the file, downloads it from private storage, and sends it as an image/PDF to Lovable AI (`openai/gpt-6-astra`, Responses API, streamed, strict JSON schema). It then compares the result with the form's GSTIN/PAN/business name and upserts a row. It runs once per upload; re-runs happen only on a staff click. Nothing runs in the background or on page load.
- Error handling: 402/403/429 show a clear "AI check unavailable right now" message and store status `error`. The application still submits.
- Admin functions `listTradeApplications` are extended with checks and notes, and a new `addTradeInternalNote` is added. Both are staff-gated as the existing ones are.
- `roadmap.md` gets this task added.
