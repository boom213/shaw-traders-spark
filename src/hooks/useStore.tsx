import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type CartLine = { productId: string; qty: number };

export type Lists = {
  cart: CartLine[];
  wishlist: string[];
  saved: string[];
  recentlyViewed: string[];
};

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
  const cart = [...remote.cart];
  for (const line of local.cart) {
    const hit = cart.find((c) => c.productId === line.productId);
    if (hit) hit.qty = Math.max(hit.qty, line.qty);
    else cart.push(line);
  }
  const uniq = (a: string[], b: string[]) => Array.from(new Set([...a, ...b]));
  return {
    cart,
    // Wishlists belong to an account. Never merge a previous signed-out or
    // different account's local wishlist into the newly signed-in account.
    wishlist: remote.wishlist,
    saved: uniq(local.saved, remote.saved),
    recentlyViewed: uniq(local.recentlyViewed, remote.recentlyViewed).slice(0, 12),
  };
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
  clearCart: () => void;
};

const StoreContext = createContext<Ctx | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [lists, setLists] = useState<Lists>(EMPTY);
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [wishlistReady, setWishlistReady] = useState(false);
  const mirrored = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setLists(readLocal());
    setReady(true);
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
    (async () => {
      const { data } = await supabase
        .from("user_lists")
        .select("cart, wishlist, saved, recently_viewed")
        .eq("profile_id", user.id)
        .maybeSingle();
      const remote = listsFromRow(data);
      setLists((local) => {
        const merged = mergeLists(local, remote);
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
      clearCart: () => update((l) => ({ ...l, cart: [] })),
    }),
    [lists, ready, user, authReady, wishlistReady, update],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside StoreProvider");
  return ctx;
}
