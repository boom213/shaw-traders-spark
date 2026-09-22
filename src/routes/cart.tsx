import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ImageIcon, Minus, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SectionHeading } from "@/components/site/Empty";
import { ProductCard } from "@/components/site/ProductCard";
import { useStore } from "@/hooks/useStore";
import { supabase } from "@/integrations/supabase/client";
import { canonical, formatINR, type Product } from "@/lib/catalog";
import { homeQuery, productsByIdsQuery } from "@/lib/queries";

export const COUPON_KEY = "shaw-ev-coupon";

export type AppliedCoupon = { code: string; type: "percent" | "fixed"; value: number; minOrder: number; maxDiscount?: number };

export const Route = createFileRoute("/cart")({
  head: () => ({
    meta: [
      { title: "Your Cart — Shaw Traders EV" },
      { name: "description", content: "Review the EV parts in your cart, apply a coupon and proceed to checkout at Shaw Traders EV." },
      { property: "og:title", content: "Your Cart — Shaw Traders EV" },
      { property: "og:description", content: "Review your EV parts order before checkout." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
    links: [{ rel: "canonical", href: canonical("/cart") }],
  }),
  component: CartPage,
});

export function useCartTotals(coupon?: AppliedCoupon) {
  const { lists } = useStore();
  const ids = Array.from(new Set([...lists.cart.map((c) => c.productId), ...lists.saved]));
  const { data: products, isPending } = useQuery(productsByIdsQuery(ids));
  const byId = new Map((products ?? []).map((p) => [p.id, p]));

  const lines = lists.cart
    .map((c) => ({ ...c, product: byId.get(c.productId) }))
    .filter((l): l is { productId: string; qty: number; product: Product } => Boolean(l.product));

  const subtotal = lines.reduce((n, l) => n + (l.product.price ?? 0) * l.qty, 0);
  let discount = 0;
  if (coupon && subtotal >= coupon.minOrder) {
    discount = coupon.type === "percent" ? Math.round((subtotal * coupon.value) / 100) : coupon.value;
    if (coupon.maxDiscount) discount = Math.min(discount, coupon.maxDiscount);
  }
  const shipping = subtotal === 0 || subtotal >= 999 ? 0 : 60;
  return {
    lines,
    savedProducts: lists.saved.map((id) => byId.get(id)).filter((p): p is Product => Boolean(p)),
    loading: ids.length > 0 && isPending,
    subtotal,
    discount,
    shipping,
    total: Math.max(0, subtotal - discount + shipping),
  };
}

export function readCoupon(): AppliedCoupon | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const raw = window.localStorage.getItem(COUPON_KEY);
    return raw ? (JSON.parse(raw) as AppliedCoupon) : undefined;
  } catch {
    return undefined;
  }
}

function CartPage() {
  const { lists, setQty, removeFromCart, saveForLater, moveToCart } = useStore();
  const [code, setCode] = useState("");
  const [applied, setApplied] = useState<AppliedCoupon | undefined>(() => readCoupon());
  const { lines, savedProducts, loading, subtotal, discount, shipping, total } = useCartTotals(applied);
  const { data: home } = useQuery(homeQuery());
  const recommended = (home?.latest ?? []).filter((p) => !lists.cart.some((c) => c.productId === p.id)).slice(0, 4);

  const applyCoupon = async () => {
    const entered = code.trim();
    if (!entered) return;
    const { data } = await supabase
      .from("coupons")
      .select("code, type, value, min_order, max_discount")
      .ilike("code", entered)
      .maybeSingle();
    if (!data) {
      toast.error("Coupon not found or no longer valid");
      return;
    }
    if (subtotal < Number(data.min_order)) {
      toast.error(`Minimum order ${formatINR(Number(data.min_order))}`);
      return;
    }
    const next: AppliedCoupon = {
      code: data.code,
      type: data.type as "percent" | "fixed",
      value: Number(data.value),
      minOrder: Number(data.min_order),
      ...(data.max_discount ? { maxDiscount: Number(data.max_discount) } : {}),
    };
    setApplied(next);
    window.localStorage.setItem(COUPON_KEY, JSON.stringify(next));
    toast.success("Coupon applied");
  };

  return (
    <div className="container-page py-10">
      <SectionHeading title="Your Cart" subtitle={loading ? "Loading your cart…" : `${lines.length} item(s)`} />

      {loading ? (
        <div className="grid gap-3">
          {[0, 1, 2].map((i) => <div key={i} className="h-28 animate-pulse rounded-2xl bg-muted" />)}
        </div>
      ) : lines.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border bg-surface px-6 py-14 text-center">
          <p className="text-sm text-muted-foreground">Your cart is empty.</p>
          <Button className="mt-5" asChild><Link to="/shop">Start shopping</Link></Button>
        </div>
      ) : (
        <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
          <div className="grid gap-3">
            {lines.map((l) => (
              <div key={l.productId} className="flex gap-4 rounded-2xl border border-border bg-card p-4">
                <div className="size-20 shrink-0 overflow-hidden rounded-xl bg-surface">
                  {l.product.images[0] ? (
                    <img src={l.product.images[0]} alt={l.product.name} loading="lazy" className="size-full object-cover" />
                  ) : (
                    <span className="grid size-full place-items-center text-muted-foreground"><ImageIcon className="size-5" /></span>
                  )}
                </div>
                <div className="flex-1">
                  <Link to="/product/$slug" params={{ slug: l.product.slug }} className="text-sm font-semibold hover:text-primary">{l.product.name}</Link>
                  <p className="mt-0.5 text-xs text-muted-foreground">{l.product.brand}</p>
                  <p className="mt-1 font-display font-bold">
                    {l.product.price !== undefined ? formatINR(l.product.price) : "Price on request"}
                  </p>
                  {l.product.stock <= 0 ? (
                    <p className="mt-1 text-xs font-medium text-destructive">Out of stock — remove to continue</p>
                  ) : l.qty > l.product.stock ? (
                    <p className="mt-1 text-xs font-medium text-destructive">Only {l.product.stock} available</p>
                  ) : null}
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <div className="flex items-center rounded-full border border-border">
                      <button onClick={() => setQty(l.productId, l.qty - 1)} className="grid size-8 place-items-center" aria-label="Decrease"><Minus className="size-3.5" /></button>
                      <span className="w-8 text-center text-sm font-semibold">{l.qty}</span>
                      <button
                        onClick={() => {
                          if (l.qty + 1 > l.product.stock) {
                            toast.error(`Only ${l.product.stock} in stock`);
                            return;
                          }
                          setQty(l.productId, l.qty + 1);
                        }}
                        className="grid size-8 place-items-center"
                        aria-label="Increase"
                      >
                        <Plus className="size-3.5" />
                      </button>
                    </div>
                    <button onClick={() => saveForLater(l.productId)} className="text-xs font-medium text-muted-foreground hover:text-foreground">Save for later</button>
                    <button onClick={() => removeFromCart(l.productId)} className="inline-flex items-center gap-1 text-xs font-medium text-destructive"><Trash2 className="size-3.5" /> Remove</button>
                  </div>
                </div>
              </div>
            ))}

            {savedProducts.length > 0 && (
              <div className="mt-6">
                <h3 className="mb-3 font-display text-base font-bold">Saved for later</h3>
                <div className="grid gap-2">
                  {savedProducts.map((p) => (
                    <div key={p.id} className="flex items-center justify-between rounded-xl border border-border bg-surface px-4 py-3 text-sm">
                      <span>{p.name}</span>
                      <Button size="sm" variant="outline" onClick={() => moveToCart(p.id)}>Move to cart</Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <aside className="h-fit rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)] lg:sticky lg:top-32">
            <h3 className="font-display text-base font-bold">Order summary</h3>
            <div className="mt-4 flex gap-2">
              <Input placeholder="Coupon code" value={code} onChange={(e) => setCode(e.target.value)} />
              <Button variant="outline" onClick={() => void applyCoupon()}>Apply</Button>
            </div>
            {applied && <p className="mt-2 text-xs text-primary">Coupon {applied.code} applied</p>}
            <dl className="mt-5 grid gap-2 text-sm">
              <div className="flex justify-between"><dt className="text-muted-foreground">Subtotal</dt><dd>{formatINR(subtotal)}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Discount</dt><dd className="text-primary">−{formatINR(discount)}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Shipping</dt><dd>{shipping === 0 ? "Free" : formatINR(shipping)}</dd></div>
              <div className="mt-2 flex justify-between border-t border-border pt-3 font-display text-lg font-bold"><dt>Total</dt><dd>{formatINR(total)}</dd></div>
            </dl>
            <Button className="mt-5 w-full" size="lg" asChild><Link to="/checkout">Proceed to Checkout</Link></Button>
            <p className="mt-3 text-xs text-muted-foreground">Items priced on request are not included in the total. We will confirm those prices on WhatsApp.</p>
          </aside>
        </div>
      )}

      {recommended.length > 0 && (
        <section className="mt-14">
          <SectionHeading title="Recommended for you" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {recommended.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        </section>
      )}
    </div>
  );
}
