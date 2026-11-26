import { beforeEach, describe, expect, it, vi } from "vitest";
import { edgeCachedJson, edgeCachedResponse, type EdgeCache } from "@/lib/edge-cache";

/** In-memory stand-in for Cloudflare's caches.default. */
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

describe("photos at the edge", () => {
  it("serves a photo from the edge after the first request", async () => {
    const { cache } = fakeEdge();
    let built = 0;
    const produce = async () => (built++, photo());
    await edgeCachedResponse("https://shawtradersev.com/api/public/photo/a.webp", produce, cache);
    const second = await edgeCachedResponse(
      "https://shawtradersev.com/api/public/photo/a.webp?v=2",
      produce,
      cache,
    );
    expect(await second.text()).toBe("img");
    expect(built).toBe(1);
  });

  it("never stores a missing photo or anything not marked immutable", async () => {
    const { cache, store } = fakeEdge();
    await edgeCachedResponse("https://x.test/p/missing", async () => photo(404), cache);
    await edgeCachedResponse("https://x.test/p/live", async () => photo(200, "no-store"), cache);
    expect(store.size).toBe(0);
  });

  it("works exactly as before when there is no edge cache", async () => {
    let built = 0;
    const produce = async () => (built++, photo());
    await edgeCachedResponse("https://x.test/p/a", produce, null);
    await edgeCachedResponse("https://x.test/p/a", produce, null);
    expect(built).toBe(2);
  });
});

describe("home feed at the edge", () => {
  it("shares one load between visitors and skips rejected results", async () => {
    const { cache, store } = fakeEdge();
    let loads = 0;
    const load = async () => ({ latest: [++loads] });
    expect(await edgeCachedJson("feed", 60, load, () => true, cache)).toEqual({ latest: [1] });
    expect(await edgeCachedJson("feed", 60, load, () => true, cache)).toEqual({ latest: [1] });
    expect(loads).toBe(1);
    expect(
      store.get("https://shawtradersev.com/__edge-cache/feed")?.headers.get("Cache-Control"),
    ).toBe("public, max-age=60");
    await edgeCachedJson(
      "empty",
      60,
      async () => ({ latest: [] }),
      (f) => f.latest.length > 0,
      cache,
    );
    expect(store.has("https://shawtradersev.com/__edge-cache/empty")).toBe(false);
  });

  it("still loads when the edge cache refuses the key (preview hosts)", async () => {
    const broken: EdgeCache = {
      match: async () => {
        throw new Error("not in zone");
      },
      put: async () => {
        throw new Error("not in zone");
      },
    };
    expect(
      await edgeCachedJson(
        "feed",
        60,
        async () => 5,
        () => true,
        broken,
      ),
    ).toBe(5);
  });
});

// Product thumbnails: fake storage bucket.
const files = new Map<string, { bytes: Uint8Array; type: string }>();
const uploads: { path: string; type: string; size: number }[] = [];
let downloads: string[] = [];
let infoCalls = 0;
vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: {
    storage: {
      from: () => ({
        download: async (path: string) => {
          downloads.push(path);
          const f = files.get(path);
          return f
            ? { data: new Blob([f.bytes], { type: f.type }), error: null }
            : { data: null, error: {} };
        },
        info: async (path: string) => {
          const f = files.get(path);
          infoCalls++;
          return f
            ? { data: { size: f.bytes.byteLength }, error: null }
            : { data: null, error: {} };
        },
        upload: async (path: string, bytes: Uint8Array, opts: { contentType: string }) => {
          uploads.push({ path, type: opts.contentType, size: bytes.byteLength });
          files.set(path, { bytes, type: opts.contentType });
          return { error: null };
        },
      }),
    },
  },
}));

describe("product thumbnails", () => {
  beforeEach(() => {
    files.clear();
    uploads.length = 0;
    downloads = [];
    infoCalls = 0;
  });

  it("replace an old PNG thumbnail that is bigger than its original", async () => {
    const { productThumbnailStoragePath } = await import("@/lib/product-photo");
    const { loadOrCreateProductThumbnail } = await import("@/lib/product-thumbnail.server");
    const original = "p1/photo.webp";
    const stored = productThumbnailStoragePath(original, "card");
    files.set(original, { bytes: new Uint8Array(30_000), type: "image/webp" });
    files.set(stored, { bytes: new Uint8Array(234_000), type: "image/png" });

    const thumbPath = stored; // the photo URL path equals the stored thumbnail path
    const result = await loadOrCreateProductThumbnail(thumbPath);
    expect(result?.type).toBe("image/webp");
    expect(result?.bytes.byteLength).toBe(30_000);
    expect(uploads).toEqual([{ path: stored, type: "image/webp", size: 30_000 }]);
  });

  it("keep a big PNG thumbnail without downloading an even bigger original", async () => {
    const { productThumbnailStoragePath } = await import("@/lib/product-photo");
    const { loadOrCreateProductThumbnail } = await import("@/lib/product-thumbnail.server");
    const original = "p4/photo.png";
    const stored = productThumbnailStoragePath(original, "card");
    files.set(original, { bytes: new Uint8Array(2_000_000), type: "image/png" });
    files.set(stored, { bytes: new Uint8Array(200_000), type: "image/png" });
    const result = await loadOrCreateProductThumbnail(stored);
    expect(result?.bytes.byteLength).toBe(200_000);
    expect(downloads).toEqual([stored]);
    expect(infoCalls).toBe(1);
    expect(uploads).toHaveLength(0);
  });

  it("keep a small existing thumbnail as it is", async () => {
    const { productThumbnailStoragePath } = await import("@/lib/product-photo");
    const { loadOrCreateProductThumbnail } = await import("@/lib/product-thumbnail.server");
    const original = "p2/photo.webp";
    const stored = productThumbnailStoragePath(original, "card");
    files.set(original, { bytes: new Uint8Array(30_000), type: "image/webp" });
    files.set(stored, { bytes: new Uint8Array(20_000), type: "image/png" });
    const result = await loadOrCreateProductThumbnail(stored);
    expect(result?.bytes.byteLength).toBe(20_000);
    expect(uploads).toHaveLength(0);
    expect(infoCalls).toBe(0);
  });

  it("store the original when a photo cannot be shrunk (e.g. JPEG)", async () => {
    const { productThumbnailStoragePath } = await import("@/lib/product-photo");
    const { loadOrCreateProductThumbnail } = await import("@/lib/product-thumbnail.server");
    const original = "p3/photo.jpg";
    const stored = productThumbnailStoragePath(original, "card");
    files.set(original, { bytes: new Uint8Array([0xff, 0xd8, 0xff, 1, 2, 3]), type: "image/jpeg" });
    const result = await loadOrCreateProductThumbnail(stored);
    expect(result?.type).toBe("image/jpeg");
    expect(uploads).toEqual([{ path: stored, type: "image/jpeg", size: 6 }]);
  });
});

describe("photo route", () => {
  const edge = fakeEdge();
  beforeEach(() => {
    files.clear();
    edge.store.clear();
    (globalThis as { caches?: unknown }).caches = { default: edge.cache };
  });

  type Get = (ctx: { params: { _splat: string }; request: Request }) => Promise<Response>;
  const get = async (splat: string) => {
    const { Route } = await import("@/routes/api/public/photo/$");
    const handlers = (Route.options as unknown as { server: { handlers: { GET: Get } } }).server
      .handlers;
    return handlers.GET({
      params: { _splat: splat },
      request: new Request(`https://shawtradersev.com/api/public/photo/${splat}`),
    });
  };

  it("keeps product photos at the edge after the first request", async () => {
    files.set("p5/full.webp", { bytes: new Uint8Array([1, 2, 3]), type: "image/webp" });
    expect((await get("p5/full.webp")).status).toBe(200);
    files.delete("p5/full.webp");
    const again = await get("p5/full.webp");
    expect(again.status).toBe(200);
    expect(new Uint8Array(await again.arrayBuffer())).toEqual(new Uint8Array([1, 2, 3]));
  });

  it("never keeps review photos or missing photos at the edge", async () => {
    files.set("r1.webp", { bytes: new Uint8Array([9]), type: "image/webp" });
    expect((await get("review-photos/r1.webp")).status).toBe(200);
    expect((await get("p6/missing.webp")).status).toBe(404);
    expect(edge.store.size).toBe(0);
  });
});
