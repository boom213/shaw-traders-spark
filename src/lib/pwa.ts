/**
 * The only place the app's service worker is registered. It stays off in
 * development and inside the Lovable editor preview, and `?sw=off` removes an
 * already-installed worker.
 */
const SW_URL = "/sw.js";

function blockedHere(): boolean {
  if (typeof window === "undefined") return true;
  if (!import.meta.env.PROD) return true;
  if (window.self !== window.top) return true;
  const host = window.location.hostname;
  if (host.startsWith("id-preview--") || host.startsWith("preview--")) return true;
  if (host === "lovableproject.com" || host.endsWith(".lovableproject.com")) return true;
  if (host === "lovableproject-dev.com" || host.endsWith(".lovableproject-dev.com")) return true;
  if (host === "beta.lovable.dev" || host.endsWith(".beta.lovable.dev")) return true;
  if (new URLSearchParams(window.location.search).has("sw") && new URLSearchParams(window.location.search).get("sw") === "off")
    return true;
  return false;
}

async function unregisterOurWorker() {
  if (!("serviceWorker" in navigator)) return;
  const regs = await navigator.serviceWorker.getRegistrations();
  await Promise.allSettled(
    regs
      .filter((r) => (r.active?.scriptURL ?? r.installing?.scriptURL ?? "").endsWith(SW_URL))
      .map((r) => r.unregister()),
  );
}

export function setupServiceWorker() {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  if (blockedHere()) {
    void unregisterOurWorker();
    return;
  }
  window.addEventListener("load", () => {
    void navigator.serviceWorker.register(SW_URL, { scope: "/" }).catch(() => {
      /* offline browsing is a bonus; never break the page for it */
    });
  });
}
