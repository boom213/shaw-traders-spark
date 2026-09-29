export type CartLineState = { productId: string; qty: number };

export type ShoppingListsState = {
  cart: CartLineState[];
  wishlist: string[];
  saved: string[];
  recentlyViewed: string[];
  cartClearedAt: number | null;
};

export function mergeShoppingLists(local: ShoppingListsState, remote: ShoppingListsState): ShoppingListsState {
  const localClearIsNewer = local.cart.length === 0
    && local.cartClearedAt !== null
    && local.cartClearedAt >= (remote.cartClearedAt ?? 0);
  const remoteClearIsNewer = remote.cart.length === 0
    && remote.cartClearedAt !== null
    && remote.cartClearedAt > (local.cartClearedAt ?? 0);
  const cart = localClearIsNewer || remoteClearIsNewer ? [] : remote.cart.map((line) => ({ ...line }));
  if (!localClearIsNewer && !remoteClearIsNewer) {
    for (const line of local.cart) {
      const match = cart.find((candidate) => candidate.productId === line.productId);
      if (match) match.qty = Math.max(match.qty, line.qty);
      else cart.push({ ...line });
    }
  }

  const unique = (left: string[], right: string[]) => Array.from(new Set([...left, ...right]));
  return {
    cart,
    wishlist: remote.wishlist,
    saved: unique(local.saved, remote.saved),
    recentlyViewed: unique(local.recentlyViewed, remote.recentlyViewed).slice(0, 12),
    cartClearedAt: Math.max(local.cartClearedAt ?? 0, remote.cartClearedAt ?? 0) || null,
  };
}

export function withoutCart(lists: ShoppingListsState, cartClearedAt = Date.now()): ShoppingListsState {
  return { ...lists, cart: [], cartClearedAt };
}