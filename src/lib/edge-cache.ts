import { BUSINESS } from "@/lib/catalog";

/**
 * Cloudflare's per-data-centre cache (caches.default). Public responses that
 * never change, and short-lived shared JSON, are served from the edge instead
 * of being rebuilt by the server for every visitor. Outside Cloudflare (tests,
 * local dev, preview hosts) the cache is missing or refuses keys, and
 * everything runs exactly as before.
 */
export type EdgeCache = {
  match(key: Request): Promise<Response | undefined>;
  put(key: Request, response: Response): Promise<void>;
};

export function edgeCache(): EdgeCache | null {
  const cache = (globalThis as { caches?: { default?: EdgeCache } }).caches?.default;
  return cache && typeof cache.match === "function" && typeof cache.put === "function"
    ? cache
    : null;
}

/** Response header that says how the edge cache answered (for checking it works). */
export const EDGE_CACHE_HEADER = "X-Edge-Cache";

/**
 * Copy of a response with the edge-cache status header. Cached responses have
 * read-only headers, so the header is always set on a copy.
 */
function withStatus(response: Response, status: string): Response {
  const copy = new Response(response.body, response);
  copy.headers.set(EDGE_CACHE_HEADER, status);
  return copy;
}

/**
 * Serve a GET response from the edge cache, keyed by path (query ignored).
 * Only 200 responses marked `immutable` are stored, so errors are never kept.
 * The X-Edge-Cache header reports what happened:
 * HIT (served from the edge), MISS (built and stored), NOSTORE (built, not
 * cacheable), ERROR (the edge cache refused) or OFF (no edge cache here).
 */
export async function edgeCachedResponse(
  url: string,
  produce: () => Promise<Response>,
  cache: EdgeCache | null = edgeCache(),
): Promise<Response> {
  if (!cache) return withStatus(await produce(), "OFF");
  const { origin, pathname } = new URL(url);
  const key = new Request(origin + pathname);
  let failed = false;
  const hit = await cache.match(key).catch(() => {
    failed = true;
    return undefined;
  });
  if (hit) return withStatus(hit, "HIT");
  const response = await produce();
  if (response.status !== 200 || !/immutable/.test(response.headers.get("Cache-Control") ?? "")) {
    return withStatus(response, "NOSTORE");
  }
  await cache.put(key, response.clone()).catch(() => {
    failed = true;
  });
  return withStatus(response, failed ? "ERROR" : "MISS");
}

/**
 * A public JSON value shared by every visitor in a data centre for
 * `maxAgeSeconds`. Results the caller rejects with `keep` are never stored.
 */
export async function edgeCachedJson<T>(
  name: string,
  maxAgeSeconds: number,
  load: () => Promise<T>,
  keep: (data: T) => boolean = () => true,
  cache: EdgeCache | null = edgeCache(),
): Promise<T> {
  if (!cache) return load();
  const key = new Request(`${BUSINESS.site}/__edge-cache/${name}`);
  const hit = await cache.match(key).catch(() => undefined);
  if (hit) {
    try {
      return (await hit.json()) as T;
    } catch {
      // Unreadable entry: load fresh below.
    }
  }
  const data = await load();
  if (keep(data)) {
    const body = new Response(JSON.stringify(data), {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": `public, max-age=${maxAgeSeconds}`,
      },
    });
    await cache.put(key, body).catch(() => undefined);
  }
  return data;
}
