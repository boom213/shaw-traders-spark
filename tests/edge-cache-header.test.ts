import { describe, expect, it } from "vitest";
import { EDGE_CACHE_HEADER, edgeCachedResponse, type EdgeCache } from "@/lib/edge-cache";

function fakeEdge() {
  const store = new Map<string, Response>();
  const cache: EdgeCache = {
    match: async (key) => store.get(key.url)?.clone(),
    put: async (key, response) => void store.set(key.url, response),
  };
  return { cache, store };
}

const photo = (status = 200, cacheControl = "public, max-age=31536000, immutable") =>
  new Response("img", { status, headers: { "Cache-Control": cacheControl } });

const status = (r: Response) => r.headers.get(EDGE_CACHE_HEADER);

describe("X-Edge-Cache header on photos", () => {
  it("says MISS the first time and HIT after, with the same photo", async () => {
    const { cache, store } = fakeEdge();
    const url = "https://shawtradersev.com/api/public/photo/a.webp";
    const first = await edgeCachedResponse(url, async () => photo(), cache);
    const second = await edgeCachedResponse(url, async () => photo(), cache);
    expect(status(first)).toBe("MISS");
    expect(status(second)).toBe("HIT");
    expect(await second.text()).toBe("img");
    expect(second.headers.get("Cache-Control")).toContain("immutable");
    // The stored copy itself carries no status, so a HIT never reads "MISS".
    expect(store.get(url)?.headers.get(EDGE_CACHE_HEADER)).toBeNull();
  });

  it("says NOSTORE for missing or non-immutable responses", async () => {
    const { cache } = fakeEdge();
    expect(
      status(await edgeCachedResponse("https://x.test/p/1", async () => photo(404), cache)),
    ).toBe("NOSTORE");
    expect(
      status(
        await edgeCachedResponse("https://x.test/p/2", async () => photo(200, "no-store"), cache),
      ),
    ).toBe("NOSTORE");
  });

  it("says ERROR when the edge cache refuses, and still serves the photo", async () => {
    const refusing: EdgeCache = {
      match: async () => undefined,
      put: async () => {
        throw new Error("not allowed");
      },
    };
    const r = await edgeCachedResponse("https://x.test/p/3", async () => photo(), refusing);
    expect(status(r)).toBe("ERROR");
    expect(await r.text()).toBe("img");
  });

  it("says OFF where there is no edge cache", async () => {
    const r = await edgeCachedResponse("https://x.test/p/4", async () => photo(), null);
    expect(status(r)).toBe("OFF");
    expect(r.status).toBe(200);
  });

  it("can label a cached response whose headers are read-only", async () => {
    const frozen = photo();
    Object.defineProperty(frozen, "headers", { value: new Headers(frozen.headers) });
    Object.freeze(frozen.headers);
    const cache: EdgeCache = { match: async () => frozen, put: async () => undefined };
    expect(status(await edgeCachedResponse("https://x.test/p/5", async () => photo(), cache))).toBe(
      "HIT",
    );
  });
});
