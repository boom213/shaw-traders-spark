import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  emptyState,
  loadState,
  saveState,
  type Order,
  type Product,
  type Review,
  type StoreState,
} from "@/lib/catalog";

type Ctx = {
  state: StoreState;
  ready: boolean;
  update: (fn: (s: StoreState) => StoreState) => void;
  addToCart: (productId: string, qty?: number) => void;
  setQty: (productId: string, qty: number) => void;
  removeFromCart: (productId: string) => void;
  saveForLater: (productId: string) => void;
  toggleWishlist: (productId: string) => void;
  markViewed: (productId: string) => void;
  upsertProduct: (p: Product) => void;
  deleteProduct: (id: string) => void;
  addOrder: (o: Order) => void;
  addReview: (r: Review) => void;
  clearCart: () => void;
};

const StoreContext = createContext<Ctx | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<StoreState>(emptyState);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setState(loadState());
    setReady(true);
    const sync = () => setState(loadState());
    window.addEventListener("shaw-store-change", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("shaw-store-change", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const update = useCallback((fn: (s: StoreState) => StoreState) => {
    setState((prev) => {
      const next = fn(prev);
      saveState(next);
      return next;
    });
  }, []);

  const value = useMemo<Ctx>(
    () => ({
      state,
      ready,
      update,
      addToCart: (productId, qty = 1) =>
        update((s) => {
          const existing = s.cart.find((c) => c.productId === productId);
          return {
            ...s,
            cart: existing
              ? s.cart.map((c) => (c.productId === productId ? { ...c, qty: c.qty + qty } : c))
              : [...s.cart, { productId, qty }],
          };
        }),
      setQty: (productId, qty) =>
        update((s) => ({
          ...s,
          cart: qty <= 0 ? s.cart.filter((c) => c.productId !== productId) : s.cart.map((c) => (c.productId === productId ? { ...c, qty } : c)),
        })),
      removeFromCart: (productId) => update((s) => ({ ...s, cart: s.cart.filter((c) => c.productId !== productId) })),
      saveForLater: (productId) =>
        update((s) => ({
          ...s,
          cart: s.cart.filter((c) => c.productId !== productId),
          saved: s.saved.includes(productId) ? s.saved : [...s.saved, productId],
        })),
      toggleWishlist: (productId) =>
        update((s) => ({
          ...s,
          wishlist: s.wishlist.includes(productId) ? s.wishlist.filter((w) => w !== productId) : [...s.wishlist, productId],
        })),
      markViewed: (productId) =>
        update((s) => ({ ...s, recentlyViewed: [productId, ...s.recentlyViewed.filter((r) => r !== productId)].slice(0, 12) })),
      upsertProduct: (p) =>
        update((s) => ({
          ...s,
          products: s.products.some((x) => x.id === p.id) ? s.products.map((x) => (x.id === p.id ? p : x)) : [p, ...s.products],
        })),
      deleteProduct: (id) => update((s) => ({ ...s, products: s.products.filter((p) => p.id !== id) })),
      addOrder: (o) => update((s) => ({ ...s, orders: [o, ...s.orders] })),
      addReview: (r) => update((s) => ({ ...s, reviews: [r, ...s.reviews] })),
      clearCart: () => update((s) => ({ ...s, cart: [] })),
    }),
    [state, ready, update],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside StoreProvider");
  return ctx;
}

export function useProducts() {
  return useStore().state.products;
}
