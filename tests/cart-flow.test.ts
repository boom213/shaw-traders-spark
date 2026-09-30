import { describe, expect, it } from "vitest";
import { mergeShoppingLists, withoutCart, type ShoppingListsState } from "@/lib/cart-state";

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
});

describe("checkout cart-clear wiring", () => {
  it("clears only confirmed order outcomes and preserves failed or cancelled payments", async () => {
    const source = await import("node:fs/promises").then((fs) => fs.readFile("src/routes/_authenticated/_customer/checkout.tsx", "utf8"));
    expect(source).toContain("await clearCart()");
    expect(source).toContain('result.status === "success"');
    expect(source).toContain("if (check.paid)");
    expect(source).toContain('result.status === "dismissed"');
    expect(source).toContain("Payment cancelled. Your cart is still here.");
    expect(source).toContain("sessionStorage.setItem(PENDING_CHECKOUT_KEY");
    expect(source).toContain('latest.status === "paid"');
  });
});