/** Sites allowed to receive account confirmation links. */
const TRUSTED_HOSTS = new Set([
  "shawtradersev.com",
  "www.shawtradersev.com",
  "shawtradersev-info.lovable.app",
  "id-preview--8707066f-ed7e-4c1e-a396-e87e6edb1325.lovable.app",
]);

const DEFAULT_ORIGIN = "https://shawtradersev.com";

/**
 * Returns the request origin only when it is one of the shop's own sites
 * (or a local dev server); otherwise the main site. Never trust an Origin
 * header as a redirect target without this check.
 */
export function trustedSiteOrigin(origin: string | null | undefined, fallback: string = DEFAULT_ORIGIN): string {
  const safeFallback = /^https:\/\//.test(fallback) ? fallback.replace(/\/+$/, "") : DEFAULT_ORIGIN;
  if (!origin) return safeFallback;
  try {
    const url = new URL(origin);
    if (url.origin !== origin.replace(/\/+$/, "")) return safeFallback;
    if (url.protocol === "https:" && TRUSTED_HOSTS.has(url.hostname)) return url.origin;
    if (url.protocol === "http:" && (url.hostname === "localhost" || url.hostname === "127.0.0.1")) return url.origin;
  } catch {
    return safeFallback;
  }
  return safeFallback;
}
