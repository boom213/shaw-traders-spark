import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { mergeShoppingLists, withoutCart, type ShoppingListsState } from "@/lib/cart-state";

export type CartLine = ShoppingListsState["cart"][number];

export type Lists = ShoppingListsState;

const EMPTY: Lists = { cart: [], wishlist: [], saved: [], recentlyViewed: [] };
const KEY = "shaw-ev-lists";

function readLocal(): Lists {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? { ...EMPTY, ...(JSON.parse(raw) as Partial<Lists>) } : EMPTY;
  } catch {
    return EMPTY;
  }
}

function writeLocal(lists: Lists) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(lists));
}

function mergeLists(local: Lists, remote: Lists): Lists {
  return mergeShoppingLists(local, remote);
}

function listsFromRow(data: {
  cart: unknown;
  wishlist: unknown;
  saved: unknown;
  recently_viewed: unknown;
} | null): Lists {
  return data
    ? {
        cart: (data.cart as CartLine[]) ?? [],
        wishlist: (data.wishlist as string[]) ?? [],
        saved: (data.saved as string[]) ?? [],
        recentlyViewed: (data.recently_viewed as string[]) ?? [],
      }
    : EMPTY;
}

type Ctx = {
  lists: Lists;
  ready: boolean;
  user: User | null;
  authReady: boolean;
  wishlistReady: boolean;
  addToCart: (productId: string, qty?: number, stock?: number) => boolean;
  setQty: (productId: string, qty: number) => void;
  removeFromCart: (productId: string) => void;
  saveForLater: (productId: string) => void;
  moveToCart: (productId: string) => void;
  toggleWishlist: (productId: string) => void;
  markViewed: (productId: string) => void;
  clearCart: () => Promise<boolean>;
};

// Preserve context identity when Vite hot-updates provider and consumer modules separately.
const StoreContext = import.meta.hot?.data.storeContext as ReturnType<typeof createContext<Ctx | null>> | undefined
  ?? createContext<Ctx | null>(null);
if (import.meta.hot) import.meta.hot.data.storeContext = StoreContext;

export function StoreProvider({ children }: { children: ReactNode }) {
  const [lists, setLists] = useState<Lists>(EMPTY);
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [wishlistReady, setWishlistReady] = useState(false);
  const mirrored = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const listsRef = useRef<Lists>(EMPTY);
  const revision = useRef(0);

  const replaceLists = useCallback((next: Lists) => {
    listsRef.current = next;
    writeLocal(next);
    setLists(next);
  }, []);

  useEffect(() => {
    const local = readLocal();
    listsRef.current = local;
    setLists(local);
    setReady(true);
  }, []);

  useEffect(() => {
    const syncFromAnotherTab = (event: StorageEvent) => {
      if (event.key !== KEY) return;
      revision.current += 1;
      const next = readLocal();
      listsRef.current = next;
      setLists(next);
    };
    window.addEventListener("storage", syncFromAnotherTab);
    return () => window.removeEventListener("storage", syncFromAnotherTab);
  }, []);

  // Track the signed-in customer and pull their saved lists down.
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      setAuthReady(true);
      if (event === "SIGNED_IN") {
        mirrored.current = false;
        setWishlistReady(false);
      }
      if (event === "SIGNED_OUT") {
        mirrored.current = false;
        setWishlistReady(false);
        update((current) => ({ ...current, wishlist: [] }));
      }
    });
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setAuthReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user || !ready || mirrored.current) return;
    mirrored.current = true;
    const startedAtRevision = revision.current;
    (async () => {
      const { data } = await supabase
        .from("user_lists")
        .select("cart, wishlist, saved, recently_viewed")
        .eq("profile_id", user.id)
        .maybeSingle();
      const remote = listsFromRow(data);
      if (revision.current !== startedAtRevision) {
        setWishlistReady(true);
        return;
      }
      setLists((local) => {
        const merged = mergeLists(local, remote);
        listsRef.current = merged;
        writeLocal(merged);
        return merged;
      });
      setWishlistReady(true);
    })();
  }, [user, ready]);

  // Push changes up so the lists follow the customer between devices.
  useEffect(() => {
    if (!user || !ready || !mirrored.current) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      void supabase
        .from("user_lists")
        .upsert({
          profile_id: user.id,
          cart: lists.cart as never,
          wishlist: lists.wishlist as never,
          saved: lists.saved as never,
          recently_viewed: lists.recentlyViewed as never,
        })
        .then(({ error }) => {
          if (error) console.error("Could not sync shopping lists", error.message);
        });
    }, 600);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [lists, user, ready]);

  const update = useCallback((fn: (l: Lists) => Lists) => {
    setLists((prev) => {
      const next = fn(prev);
      revision.current += 1;
      listsRef.current = next;
      writeLocal(next);
      return next;
    });
  }, []);

  const value = useMemo<Ctx>(
    () => ({
      lists,
      ready,
      user,
      authReady,
      wishlistReady,
      addToCart: (productId, qty = 1, stock) => {
        const existing = lists.cart.find((c) => c.productId === productId)?.qty ?? 0;
        if (stock !== undefined && existing + qty > stock) return false;
        update((l) => {
          const hit = l.cart.find((c) => c.productId === productId);
          return {
            ...l,
            cart: hit
              ? l.cart.map((c) => (c.productId === productId ? { ...c, qty: c.qty + qty } : c))
              : [...l.cart, { productId, qty }],
          };
        });
        return true;
      },
      setQty: (productId, qty) =>
        update((l) => ({
          ...l,
          cart:
            qty <= 0
              ? l.cart.filter((c) => c.productId !== productId)
              : l.cart.map((c) => (c.productId === productId ? { ...c, qty } : c)),
        })),
      removeFromCart: (productId) => update((l) => ({ ...l, cart: l.cart.filter((c) => c.productId !== productId) })),
      saveForLater: (productId) =>
        update((l) => ({
          ...l,
          cart: l.cart.filter((c) => c.productId !== productId),
          saved: l.saved.includes(productId) ? l.saved : [...l.saved, productId],
        })),
      moveToCart: (productId) =>
        update((l) => ({
          ...l,
          saved: l.saved.filter((s) => s !== productId),
          cart: l.cart.some((c) => c.productId === productId) ? l.cart : [...l.cart, { productId, qty: 1 }],
        })),
      toggleWishlist: (productId) =>
        user
          ? update((l) => ({
              ...l,
              wishlist: l.wishlist.includes(productId)
                ? l.wishlist.filter((w) => w !== productId)
                : [...l.wishlist, productId],
            }))
          : undefined,
      markViewed: (productId) =>
        update((l) => ({
          ...l,
          recentlyViewed: [productId, ...l.recentlyViewed.filter((r) => r !== productId)].slice(0, 12),
        })),
      clearCart: async () => {
        revision.current += 1;
        const cleared = withoutCart(listsRef.current);
        if (timer.current) {
          clearTimeout(timer.current);
          timer.current = null;
        }
        replaceLists(cleared);
        if (!user) return true;
        const { error } = await supabase.from("user_lists").upsert({
          profile_id: user.id,
          cart: cleared.cart as never,
          wishlist: cleared.wishlist as never,
          saved: cleared.saved as never,
          recently_viewed: cleared.recentlyViewed as never,
        });
        if (error) {
          console.error("Could not clear the synced cart", error.message);
          return false;
        }
        return true;
      },
    }),
    [lists, ready, user, authReady, wishlistReady, update, replaceLists],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside StoreProvider");
  return ctx;
}
