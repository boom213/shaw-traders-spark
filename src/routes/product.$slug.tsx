import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { CheckCircle2, MessageCircle, ShieldCheck, Star, Truck } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SectionHeading } from "@/components/site/Empty";
import { ProductCard, ProductRating } from "@/components/site/ProductCard";
import { useStore } from "@/hooks/useStore";
import { supabase } from "@/integrations/supabase/client";
import { BUSINESS, canonical, discountPct, formatINR, whatsappLink } from "@/lib/catalog";
import { productQuery } from "@/lib/queries";
import { imageFor, isPlaceholder } from "@/lib/placeholders";

export const Route = createFileRoute("/product/$slug")({
  loader: async ({ context, params }) => {
    const data = await context.queryClient.ensureQueryData(productQuery(params.slug));
    if (!data) throw notFound();
    return { name: data.product.name, description: data.product.description ?? "" };
  },
  head: ({ loaderData, params }) => {
    const name = loaderData?.name ?? params.slug.replace(/-/g, " ");
    const title = `${name} — Shaw Traders EV`;
    const description =
      (loaderData?.description || "").slice(0, 160) ||
      `${name} available at Shaw Traders EV, Bud Bud, Bardhaman. Check price, specifications, compatibility and availability.`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "product" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
      links: [{ rel: "canonical", href: canonical(`/product/${params.slug}`) }],
    };
  },
  errorComponent: ({ error }) => (
    <div role="alert" className="container-page py-20 text-center text-sm text-muted-foreground">{error.message}</div>
  ),
  notFoundComponent: () => (
    <div className="container-page py-16 text-center">
      <h1 className="font-display text-2xl font-bold">Product not available</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        This part is not in the online catalogue. Contact us for price and availability.
      </p>
      <Button className="mt-5" asChild><Link to="/shop">Browse the shop</Link></Button>
    </div>
  ),
  component: ProductPage,
});

function ProductPage() {
  const { slug } = Route.useParams();
  const { data } = useSuspenseQuery(productQuery(slug));
  const { lists, user, addToCart, markViewed, toggleWishlist } = useStore();
  const navigate = useNavigate();
  const [active, setActive] = useState(0);
  const [fit, setFit] = useState({ brand: "", model: "", year: "" });
  const [fitResult, setFitResult] = useState<string | null>(null);
  const [review, setReview] = useState({ rating: "5", title: "", text: "" });
  const [sending, setSending] = useState(false);

  const product = data?.product;

  useEffect(() => {
    if (product) markViewed(product.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product?.id]);

  if (!data || !product) return null;

  const reviews = data.reviews;
  const related = data.related;
  const off = discountPct(product.price, product.mrp);
  const avg = reviews.length ? reviews.reduce((n, r) => n + r.rating, 0) / reviews.length : undefined;
  const waMsg = `Hello ${BUSINESS.name}, I am interested in ${product.name}. Please share availability and final price.`;

  const add = (qty = 1) => {
    if (product.stock <= 0) {
      toast.error("This part is out of stock right now");
      return false;
    }
    const ok = addToCart(product.id, qty, product.stock);
    if (!ok) toast.error(`Only ${product.stock} in stock`);
    else toast.success("Added to cart");
    return ok;
  };

  const submitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error("Please sign in to write a review");
      void navigate({ to: "/account" });
      return;
    }
    setSending(true);
    const { error } = await supabase.from("reviews").insert({
      product_id: product.id,
      profile_id: user.id,
      rating: Number(review.rating),
      title: review.title || null,
      body: review.text,
    });
    setSending(false);
    if (error) {
      toast.error("Could not submit your review. Please try again.");
      return;
    }
    setReview({ rating: "5", title: "", text: "" });
    toast.success("Review submitted — it appears once approved");
  };

  return (
    <div className="container-page py-8">
      <nav className="mb-5 text-xs text-muted-foreground">
        <Link to="/" className="hover:text-foreground">Home</Link> / <Link to="/shop" className="hover:text-foreground">Shop</Link> /{" "}
        <span className="text-foreground">{product.name}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-2">
        <div>
          <div className="aspect-square overflow-hidden rounded-3xl border border-border bg-surface">
            <img
              src={product.images[active] ?? imageFor(product)}
              alt={product.name}
              className="size-full object-cover"
              width={800}
              height={800}
            />
          </div>
          {isPlaceholder(product) && (
            <p className="mt-2 text-xs text-muted-foreground">Representative category photo. Contact us for the actual product photo.</p>
          )}
          {product.images.length > 1 && (
            <div className="mt-3 flex gap-2 overflow-x-auto">
              {product.images.map((src, i) => (
                <button key={src + i} onClick={() => setActive(i)} className={`size-16 shrink-0 overflow-hidden rounded-xl border ${i === active ? "border-primary" : "border-border"}`}>
                  <img src={src} alt={`${product.name} view ${i + 1}`} loading="lazy" className="size-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          {product.brand && <span className="text-xs font-semibold uppercase tracking-wide text-primary">{product.brand}</span>}
          <h1 className="mt-1 font-display text-2xl font-bold sm:text-3xl">{product.name}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span>SKU: {product.sku || "—"}</span>
            <ProductRating {...(avg ? { rating: avg, count: reviews.length } : {})} />
          </div>

          <div className="mt-5 rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
            {product.price !== undefined ? (
              <div className="flex flex-wrap items-baseline gap-3">
                <span className="font-display text-3xl font-bold">{formatINR(product.price)}</span>
                {product.mrp && product.mrp > product.price && <span className="text-sm text-muted-foreground line-through">{formatINR(product.mrp)}</span>}
                {off > 0 && <span className="rounded-md bg-sale px-2 py-1 text-xs font-bold text-sale-foreground">{off}% OFF</span>}
              </div>
            ) : (
              <p className="font-medium">Contact us for price and availability.</p>
            )}
            <p className={`mt-2 text-sm font-medium ${product.stock > 0 ? "text-primary" : "text-destructive"}`}>
              {product.stock > 0 ? `In stock (${product.stock} available)` : "Out of stock"}
            </p>

            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              <Button variant="outline" disabled={product.stock <= 0} onClick={() => add()}>Add to Cart</Button>
              <Button
                disabled={product.stock <= 0}
                onClick={() => {
                  if (add()) void navigate({ to: "/checkout" });
                }}
              >
                Buy Now
              </Button>
              <Button variant="secondary" className="sm:col-span-2" asChild>
                <a href={whatsappLink(waMsg)} target="_blank" rel="noreferrer"><MessageCircle className="size-4" /> Ask on WhatsApp</a>
              </Button>
              <Button variant="ghost" className="sm:col-span-2" onClick={() => toggleWishlist(product.id)}>
                {lists.wishlist.includes(product.id) ? "Remove from Wishlist" : "Save to Wishlist"}
              </Button>
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-border bg-surface p-5">
            <h2 className="font-display text-base font-bold">Not sure this fits your vehicle?</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <div className="grid gap-1.5">
                <Label className="text-xs">Vehicle brand</Label>
                <Input value={fit.brand} onChange={(e) => setFit({ ...fit, brand: e.target.value })} placeholder="Brand" />
              </div>
              <div className="grid gap-1.5">
                <Label className="text-xs">Model</Label>
                <Input value={fit.model} onChange={(e) => setFit({ ...fit, model: e.target.value })} placeholder="Model" />
              </div>
              <div className="grid gap-1.5">
                <Label className="text-xs">Year / version</Label>
                <Input value={fit.year} onChange={(e) => setFit({ ...fit, year: e.target.value })} placeholder="Year" />
              </div>
            </div>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => {
                const list = product.compatibility ?? [];
                const query = `${fit.brand} ${fit.model} ${fit.year}`.trim().toLowerCase();
                if (list.length === 0) {
                  setFitResult("Compatibility data for this product has not been added yet. Please send us your vehicle details on WhatsApp and we will confirm the fit.");
                } else if (!query) {
                  setFitResult("Enter your vehicle details to check the fit.");
                } else {
                  const hit = list.some((c) => c.toLowerCase().includes(fit.model.toLowerCase() || "\u0000") || query.includes(c.toLowerCase()));
                  setFitResult(hit ? "This part is listed as compatible with your vehicle." : "Your vehicle is not in the listed compatibility for this part. Please confirm with us on WhatsApp before ordering.");
                }
              }}
            >
              Check Compatibility
            </Button>
            {fitResult && <p className="mt-3 rounded-xl bg-background p-3 text-sm">{fitResult}</p>}
          </div>
        </div>
      </div>

      <div className="mt-12 grid gap-8 lg:grid-cols-2">
        <div>
          <h2 className="font-display text-xl font-bold">Specifications</h2>
          {product.specs && Object.keys(product.specs).length > 0 ? (
            <dl className="mt-4 overflow-hidden rounded-2xl border border-border">
              {Object.entries(product.specs).map(([k, v], i) => (
                <div key={k} className={`grid grid-cols-2 gap-4 px-4 py-3 text-sm ${i % 2 ? "bg-surface" : "bg-card"}`}>
                  <dt className="text-muted-foreground">{k}</dt>
                  <dd className="font-medium">{v}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">Specifications for this product have not been added yet. Contact us for details.</p>
          )}

          <h2 className="mt-8 font-display text-xl font-bold">Compatible vehicles / models</h2>
          {product.compatibility && product.compatibility.length > 0 ? (
            <ul className="mt-3 flex flex-wrap gap-2">
              {product.compatibility.map((c) => (
                <li key={c} className="rounded-full border border-border bg-card px-3 py-1.5 text-sm">{c}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">Compatibility information is not available for this product yet.</p>
          )}
        </div>

        <div>
          <h2 className="font-display text-xl font-bold">Description</h2>
          <p className="mt-3 whitespace-pre-line text-sm text-muted-foreground">
            {product.description || "A detailed description for this product has not been added yet. Contact us for full details."}
          </p>
          <div className="mt-6 grid gap-3">
            <div className="flex items-start gap-3 rounded-2xl border border-border bg-card p-4 text-sm">
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />
              <span>{product.warranty ? `Warranty: ${product.warranty}` : "Warranty details are not listed for this product. Please ask us before purchase."}</span>
            </div>
            <div className="flex items-start gap-3 rounded-2xl border border-border bg-card p-4 text-sm">
              <Truck className="mt-0.5 size-4 shrink-0 text-primary" />
              <span>{product.shippingInfo || "Shipping and delivery details will be confirmed at checkout or on WhatsApp."}</span>
            </div>
            {(product.weight || product.dimensions) && (
              <div className="flex items-start gap-3 rounded-2xl border border-border bg-card p-4 text-sm">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                <span>{[product.weight && `Weight: ${product.weight}`, product.dimensions && `Dimensions: ${product.dimensions}`].filter(Boolean).join(" · ")}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <section className="mt-14">
        <SectionHeading title="Customer Reviews" subtitle={reviews.length === 0 ? "No reviews yet for this product." : `${reviews.length} review(s)`} />
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="grid gap-3">
            {reviews.map((r) => (
              <div key={r.id} className="rounded-2xl border border-border bg-card p-4">
                <div className="flex items-center gap-2">
                  <span className="flex text-primary">{Array.from({ length: r.rating }).map((_, i) => <Star key={i} className="size-3.5 fill-current" />)}</span>
                  <span className="text-sm font-semibold">{r.title ?? r.name}</span>
                  {r.verified && <span className="rounded-md bg-accent px-1.5 py-0.5 text-[10px] font-bold text-accent-foreground">Verified purchase</span>}
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{r.body}</p>
              </div>
            ))}
          </div>
          <form className="rounded-2xl border border-border bg-surface p-5" onSubmit={submitReview}>
            <h3 className="font-display text-base font-bold">Write a review</h3>
            <div className="mt-3 grid gap-3">
              <Select value={review.rating} onValueChange={(v) => setReview({ ...review, rating: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{[5, 4, 3, 2, 1].map((r) => <SelectItem key={r} value={String(r)}>{r} star{r > 1 ? "s" : ""}</SelectItem>)}</SelectContent>
              </Select>
              <Input placeholder="Headline (optional)" value={review.title} onChange={(e) => setReview({ ...review, title: e.target.value })} />
              <Textarea required rows={4} placeholder="Share your experience with this part" value={review.text} onChange={(e) => setReview({ ...review, text: e.target.value })} />
              <Button type="submit" disabled={sending}>{sending ? "Submitting…" : "Submit review"}</Button>
              <p className="text-xs text-muted-foreground">
                {user ? "Reviews appear after Shaw Traders approves them." : "Sign in to your account to post a review."}
              </p>
            </div>
          </form>
        </div>
      </section>

      {related.length > 0 && (
        <section className="mt-14">
          <SectionHeading title="Related products" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {related.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        </section>
      )}
    </div>
  );
}
