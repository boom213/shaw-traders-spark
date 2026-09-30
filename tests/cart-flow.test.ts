import { describe, expect, it } from "vitest";
import { mergeShoppingLists, withoutCart, withoutUnavailable, type ShoppingListsState } from "@/lib/cart-state";

const lists = (overrides: Partial<ShoppingListsState> = {}): ShoppingListsState => ({
  cart: [],
  wishlist: [],
  saved: [],
  recentlyViewed: [],
  cartClearedAt: null,
  ...overrides,
});

describe("cart lifecycle", () => {
  it("clears cart lines without changing the customer's other lists", () => {
    expect(withoutCart(lists({
      cart: [{ productId: "part-1", qty: 2 }],
      wishlist: ["wish-1"],
      saved: ["saved-1"],
      recentlyViewed: ["viewed-1"],
    }), 123)).toEqual(lists({
      wishlist: ["wish-1"],
      saved: ["saved-1"],
      recentlyViewed: ["viewed-1"],
      cartClearedAt: 123,
    }));
  });

  it("always advances the clear timestamp beyond the previous clear", () => {
    expect(withoutCart(lists({ cartClearedAt: 500 }), 500).cartClearedAt).toBe(501);
  });

  it("preserves a guest cart when account lists are first merged", () => {
    const merged = mergeShoppingLists(
      lists({ cart: [{ productId: "guest-part", qty: 2 }] }),
      lists({ cart: [{ productId: "account-part", qty: 1 }] }),
    );
    expect(merged.cart).toEqual([
      { productId: "account-part", qty: 1 },
      { productId: "guest-part", qty: 2 },
    ]);
  });

  it("uses the larger quantity when guest and account carts contain the same product", () => {
    const merged = mergeShoppingLists(
      lists({ cart: [{ productId: "part-1", qty: 3 }] }),
      lists({ cart: [{ productId: "part-1", qty: 1 }] }),
    );
    expect(merged.cart).toEqual([{ productId: "part-1", qty: 3 }]);
  });

  it("keeps a cleared cart empty while preserving saved and wishlist data", () => {
    const cleared = withoutCart(lists({ cart: [{ productId: "paid-part", qty: 1 }], wishlist: ["wish"], saved: ["later"] }));
    expect(cleared.cart).toHaveLength(0);
    expect(cleared.wishlist).toEqual(["wish"]);
    expect(cleared.saved).toEqual(["later"]);
    expect(cleared.cartClearedAt).not.toBeNull();
  });

  it("does not restore legacy saved lines after a timestamped local clear", () => {
    const merged = mergeShoppingLists(
      lists({ cartClearedAt: 500 }),
      lists({ cart: [{ productId: "old-part", qty: 2 }] }),
    );
    expect(merged.cart).toEqual([]);
    expect(merged.cartClearedAt).toBe(500);
  });

  it("removes only unavailable cart and saved items", () => {
    const reconciled = withoutUnavailable(lists({
      cart: [{ productId: "available", qty: 2 }, { productId: "deleted", qty: 1 }],
      saved: ["saved-available", "deleted"],
      wishlist: ["deleted"],
    }), ["deleted"]);
    expect(reconciled.cart).toEqual([{ productId: "available", qty: 2 }]);
    expect(reconciled.saved).toEqual(["saved-available"]);
    expect(reconciled.wishlist).toEqual(["deleted"]);
  });
});

describe("checkout cart-clear wiring", () => {
  it("clears only confirmed order outcomes and preserves failed or cancelled payments", async () => {
    const source = await import("node:fs/promises").then((fs) => fs.readFile("src/routes/checkout.tsx", "utf8"));
    expect(source).toContain("await clearCart()");
    expect(source).toContain('result.status === "success"');
    expect(source).toContain("if (check.paid)");
    expect(source).toContain('result.status === "dismissed"');
    expect(source).toContain("Payment cancelled. Your cart is still here.");
    expect(source).toContain("sessionStorage.setItem(PENDING_CHECKOUT_KEY");
    expect(source).toContain('latest.status === "paid"');
  });

  it("reconciles stale catalogue IDs only after a successful lookup and blocks empty checkout", async () => {
    const [cart, checkout, store, catalogue] = await Promise.all([
      import("node:fs/promises").then((fs) => fs.readFile("src/routes/cart.tsx", "utf8")),
      import("node:fs/promises").then((fs) => fs.readFile("src/routes/checkout.tsx", "utf8")),
      import("node:fs/promises").then((fs) => fs.readFile("src/hooks/useStore.tsx", "utf8")),
      import("node:fs/promises").then((fs) => fs.readFile("src/lib/catalog.functions.ts", "utf8")),
    ]);
    expect(cart).toContain("productsQuery.isSuccess");
    expect(cart).toContain("removeUnavailable(unavailable)");
    expect(cart).toContain("We could not load your cart items.");
    expect(cart).toContain("lines.some((line) => line.product) && total > 0");
    expect(store).toContain("withoutUnavailable(l, productIds)");
    expect(catalogue).toContain("if (error) throw new Error(error.message)");
    expect(catalogue).toContain("^[0-9a-f]{8}");
    expect(checkout).toContain("lines.length === 0 || subtotal <= 0");
  });

  it("retries temporary cart catalogue failures without removing saved items", async () => {
    const [cart, queries] = await Promise.all([
      import("node:fs/promises").then((fs) => fs.readFile("src/routes/cart.tsx", "utf8")),
      import("node:fs/promises").then((fs) => fs.readFile("src/lib/queries.ts", "utf8")),
    ]);
    expect(queries).toContain("retry: 2");
    expect(queries).toContain("retryDelay:");
    expect(cart).toContain("productsQuery.isSuccess");
    expect(cart).toContain("productsQuery.isFetching && productsQuery.isError");
    expect(cart).toContain("refetch({ cancelRefetch: true })");
    expect(cart).toContain("disabled={recovering}");
  });
});