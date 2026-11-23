# Fix the occasional error on the preview

## What the error log shows
The Manage error log has one repeating error over the last day (about 100 entries, most recent 18:00 UTC today): "useQuoteList must be used inside QuoteListProvider". Every entry comes from the editor preview (lovableproject.com / id-preview). None come from shawtradersev.com.

The server log at the same moment shows the cause: when the code was edited, the preview's quick refresh couldn't swap in the new quote-list file. The file was reloaded with a fresh copy of its shared "quote list" container. Parts of the page still pointing at the old copy then failed, and the server answered that page load with a 500. That's why every other request you saw was a 200.

This is the same problem fixed earlier for the cart and account container ("useStore must be used inside StoreProvider").

## Fix
- Keep the quote-list container the same across quick refreshes, the way the cart container already does.
- Move the `useQuoteAccess` helper out of the quote-list file into its own file. Quick refresh can then update the file in place instead of reloading it, so the 500 stops at its source.
- Check the other site-wide containers (language, etc.) for the same weakness and apply the same guard.

## Not part of this
- The older "Could not load shop settings" entries (16:02 today) happened while the backend was paused, and were fixed earlier with automatic retries.
- The older "Failed to fetch" entries on the live site (19 Nov) were network drops.

## Check
- Edit the quote-list file while the preview is open and confirm no new error-log entries and no 500 in the server log.
- Run the existing store/provider test.
