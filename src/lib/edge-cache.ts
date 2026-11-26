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

/**
 * Serve a GET response from the edge cache, keyed by path (query ignored).
 * Only 200 responses marked `immutable` are stored, so errors are never kept.
 */
export async function edgeCachedResponse(
  url: string,
  produce: () => Promise<Response>,
  cache: EdgeCache | null = edgeCache(),
): Promise<Response> {
  if (!cache) return produce();
  const { origin, pathname } = new URL(url);
  const key = new Request(origin + pathname);
  const hit = await cache.match(key).catch(() => undefined);
  if (hit) return hit;
  const response = await produce();
  if (response.status === 200 && /immutable/.test(response.headers.get("Cache-Control") ?? "")) {
    await cache.put(key, response.clone()).catch(() => undefined);
  }
  return response;
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
