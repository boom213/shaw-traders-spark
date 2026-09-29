export type CartLineState = { productId: string; qty: number };

export type ShoppingListsState = {
  cart: CartLineState[];
  wishlist: string[];
  saved: string[];
  recentlyViewed: string[];
};

export function mergeShoppingLists(local: ShoppingListsState, remote: ShoppingListsState): ShoppingListsState {
  const cart = remote.cart.map((line) => ({ ...line }));
  for (const line of local.cart) {
    const match = cart.find((candidate) => candidate.productId === line.productId);
    if (match) match.qty = Math.max(match.qty, line.qty);
    else cart.push({ ...line });
  }

  const unique = (left: string[], right: string[]) => Array.from(new Set([...left, ...right]));
  return {
    cart,
    wishlist: remote.wishlist,
    saved: unique(local.saved, remote.saved),
    recentlyViewed: unique(local.recentlyViewed, remote.recentlyViewed).slice(0, 12),
  };
}

export function withoutCart(lists: ShoppingListsState): ShoppingListsState {
  return { ...lists, cart: [] };
}