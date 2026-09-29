import { describe, expect, it } from "vitest";
import { mergeShoppingLists, type ShoppingListsState } from "@/lib/cart-state";

const lists = (overrides: Partial<ShoppingListsState> = {}): ShoppingListsState => ({
  cart: [],
  wishlist: [],
  saved: [],
  recentlyViewed: [],
  cartClearedAt: null,
  ...overrides,
});

describe("store provider stability", () => {
  it("preserves the store context identity across Vite hot updates", async () => {
    const source = await import("node:fs/promises").then((fs) => fs.readFile("src/hooks/useStore.tsx", "utf8"));
    expect(source).toContain("import.meta.hot?.data.storeContext");
    expect(source).toContain("import.meta.hot.data.storeContext = StoreContext");
  });

  it("keeps the storefront inside StoreProvider", async () => {
    const source = await import("node:fs/promises").then((fs) => fs.readFile("src/routes/__root.tsx", "utf8"));
    const start = source.indexOf("<StoreProvider>");
    const header = source.indexOf("<Header />");
    const outlet = source.indexOf("<Outlet />");
    const end = source.indexOf("</StoreProvider>");
    expect(start).toBeGreaterThan(-1);
    expect(header).toBeGreaterThan(start);
    expect(outlet).toBeGreaterThan(start);
    expect(end).toBeGreaterThan(outlet);
  });

  it("prefetches footer settings for identical server and browser markup", async () => {
    const source = await import("node:fs/promises").then((fs) => fs.readFile("src/routes/__root.tsx", "utf8"));
    expect(source).toContain("context.queryClient.ensureQueryData(shopSettingsQuery())");
  });

  it("keeps a newer intentional local clear authoritative over stale synced cart lines", () => {
    const merged = mergeShoppingLists(
      lists({ cartClearedAt: 200 }),
      lists({ cart: [{ productId: "stale-part", qty: 1 }], cartClearedAt: 100 }),
    );
    expect(merged.cart).toEqual([]);
    expect(merged.cartClearedAt).toBe(200);
  });

  it("keeps a local clear authoritative when stale saved lines carry the same clear timestamp", () => {
    const merged = mergeShoppingLists(
      lists({ cartClearedAt: 200 }),
      lists({ cart: [{ productId: "stale-part", qty: 1 }], cartClearedAt: 200 }),
    );
    expect(merged.cart).toEqual([]);
    expect(merged.cartClearedAt).toBe(200);
  });

  it("keeps a newer remote clear authoritative over stale local lines", () => {
    const merged = mergeShoppingLists(
      lists({ cart: [{ productId: "stale-local-part", qty: 1 }], cartClearedAt: 100 }),
      lists({ cartClearedAt: 200 }),
    );
    expect(merged.cart).toEqual([]);
    expect(merged.cartClearedAt).toBe(200);
  });

  it("keeps normal cart merging unchanged without a clear signal", () => {
    const merged = mergeShoppingLists(
      lists({ cart: [{ productId: "local-part", qty: 2 }, { productId: "shared-part", qty: 3 }] }),
      lists({ cart: [{ productId: "remote-part", qty: 1 }, { productId: "shared-part", qty: 1 }] }),
    );
    expect(merged.cart).toEqual([
      { productId: "remote-part", qty: 1 },
      { productId: "shared-part", qty: 3 },
      { productId: "local-part", qty: 2 },
    ]);
  });

  it("cancels a pending upload before applying another tab's cart state", async () => {
    const source = await import("node:fs/promises").then((fs) => fs.readFile("src/hooks/useStore.tsx", "utf8"));
    const storageSync = source.slice(source.indexOf("const syncFromAnotherTab"), source.indexOf("window.addEventListener"));
    expect(storageSync).toContain("if (timer.current)");
    expect(storageSync).toContain("clearTimeout(timer.current)");
    expect(storageSync).toContain("timer.current = null");
  });

  it("waits for the initial account read and serializes remote writes", async () => {
    const source = await import("node:fs/promises").then((fs) => fs.readFile("src/hooks/useStore.tsx", "utf8"));
    const accountRead = source.slice(source.indexOf("if (!user || !ready || mirrored.current)"), source.indexOf("// Push changes up"));
    expect(accountRead.indexOf("mirrored.current = true")).toBeGreaterThan(accountRead.indexOf("maybeSingle()"));
    expect(source).toContain("writeChain.current.then(write, write)");
    expect(source).toContain("return queueRemoteWrite(user.id, cleared)");
  });
});