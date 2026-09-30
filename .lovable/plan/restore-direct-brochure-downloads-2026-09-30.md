# Restore direct brochure downloads

## Changes
- Restore the **Download Brochure** button in the homepage action row.
- Make the shared brochure button download the current catalogue PDF immediately in one click, without opening the enquiry popup.
- Apply the same direct-download behavior to the existing button on the Brands page.
- Keep the brochure PDF endpoint and existing enquiry email function intact; only the popup-based button flow will stop calling it.
- Return the homepage action row to three columns on desktop and keep its stacked layout on smaller screens.

## Verification
- Confirm the homepage has all three actions and Download Brochure starts the PDF download without a popup.
- Confirm the Brands page button also downloads the PDF immediately without a popup.
- Check desktop, tablet, and mobile layouts and confirm there are no console or build errors.

## Technical details
- Reuse `/api/public/catalogue` so manager-uploaded catalogue replacements continue to download automatically.
- Retain the shared brochure button component for consistent behavior on both pages.
