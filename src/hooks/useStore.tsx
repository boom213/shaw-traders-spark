import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { mergeShoppingLists, withoutCart, type ShoppingListsState } from "@/lib/cart-state";

export type CartLine = ShoppingListsState["cart"][number];

export type Lists = ShoppingListsState;

const EMPTY: Lists = { cart: [], wishlist: [], saved: [], recentlyViewed: [], cartClearedAt: null };
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
  cart_cleared_at: number | null;
} | null): Lists {
  return data
    ? {
        cart: (data.cart as CartLine[]) ?? [],
        wishlist: (data.wishlist as string[]) ?? [],
        saved: (data.saved as string[]) ?? [],
        recentlyViewed: (data.recently_viewed as string[]) ?? [],
        cartClearedAt: data.cart_cleared_at,
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
  removeSaved: (productId: string) => void;
  toggleWishlist: (productId: string) => void;
  removeRecentlyViewed: (productId: string) => void;
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
  const writeChain = useRef<Promise<boolean>>(Promise.resolve(true));

  const queueRemoteWrite = useCallback((profileId: string, next: Lists) => {
    const write = async () => {
      const values = {
        cart: next.cart as never,
        wishlist: next.wishlist as never,
        saved: next.saved as never,
        recently_viewed: next.recentlyViewed as never,
        cart_cleared_at: next.cartClearedAt,
      };
      let update = supabase
        .from("user_lists")
        .update(values)
        .eq("profile_id", profileId);
      update = next.cartClearedAt === null
        ? update.is("cart_cleared_at", null)
        : update.or(`cart_cleared_at.is.null,cart_cleared_at.lte.${next.cartClearedAt}`);
      const { data, error } = await update.select("profile_id");
      if (error) {
        console.error("Could not sync shopping lists", error.message);
        return false;
      }
      if ((data ?? []).length === 0) {
        const { data: existing, error: readError } = await supabase
          .from("user_lists")
          .select("profile_id")
          .eq("profile_id", profileId)
          .maybeSingle();
        if (readError) {
          console.error("Could not verify shopping lists", readError.message);
          return false;
        }
        if (existing) return true;
        const { error: insertError } = await supabase.from("user_lists").insert({ profile_id: profileId, ...values });
        if (insertError) {
          console.error("Could not create shopping lists", insertError.message);
          return false;
        }
      }
      return true;
    };
    const queued = writeChain.current.then(write, write);
    writeChain.current = queued;
    return queued;
  }, []);

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
      if (timer.current) {
        clearTimeout(timer.current);
        timer.current = null;
      }
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
    const startedAtRevision = revision.current;
    (async () => {
      const { data, error } = await supabase
        .from("user_lists")
        .select("cart, wishlist, saved, recently_viewed, cart_cleared_at")
        .eq("profile_id", user.id)
        .maybeSingle();
      if (error) {
        console.error("Could not load shopping lists", error.message);
        setWishlistReady(true);
        return;
      }
      const remote = listsFromRow(data);
      if (revision.current !== startedAtRevision) {
        mirrored.current = true;
        setWishlistReady(true);
        return;
      }
      mirrored.current = true;
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
      timer.current = null;
      void queueRemoteWrite(user.id, lists);
    }, 600);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [lists, user, ready, queueRemoteWrite]);

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
      removeSaved: (productId) => update((l) => ({ ...l, saved: l.saved.filter((id) => id !== productId) })),
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
      removeRecentlyViewed: (productId) => update((l) => ({ ...l, recentlyViewed: l.recentlyViewed.filter((id) => id !== productId) })),
      clearCart: async () => {
        revision.current += 1;
        const cleared = withoutCart(listsRef.current);
        if (timer.current) {
          clearTimeout(timer.current);
          timer.current = null;
        }
        replaceLists(cleared);
        if (!user) return true;
        return queueRemoteWrite(user.id, cleared);
      },
    }),
    [lists, ready, user, authReady, wishlistReady, update, replaceLists, queueRemoteWrite],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside StoreProvider");
  return ctx;
}
