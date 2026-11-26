/**
 * True while the shop is fetching a different page or filter result. During
 * that time the old products stay on screen, so the page must say so.
 * - routerLoading/pendingPath: Next/Previous links and filter changes wait for
 *   the /shop loader before the new page is shown.
 * - showingOldResults: the grid is showing the previous result while the new
 *   one loads in the background (keepPreviousData).
 */
export function shopIsUpdating(opts: {
  routerLoading: boolean;
  pendingPath: string;
  showingOldResults: boolean;
}): boolean {
  return (opts.routerLoading && opts.pendingPath === "/shop") || opts.showingOldResults;
}
