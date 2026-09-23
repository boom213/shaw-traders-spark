import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { BellRing, CheckCircle2, MessageCircle, Package, ShieldCheck, Star, Truck, ZoomIn } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SectionHeading } from "@/components/site/Empty";
import { EnquiryDialog } from "@/components/site/EnquiryDialog";
import { ProductCard, ProductRating } from "@/components/site/ProductCard";
import { useStore } from "@/hooks/useStore";
import { useProductOrdering } from "@/hooks/useOrderingMode";
import { staffProductMeta } from "@/lib/enquiries.functions";
import { useQuery } from "@tanstack/react-query";
import { useVehicle } from "@/hooks/useVehicle";
import { BUSINESS, canonical, discountPct, formatINR, whatsappLink } from "@/lib/catalog";
import { deliveryFor } from "@/lib/delivery";
import { productQuery } from "@/lib/queries";
import { uploadReviewPhoto } from "@/lib/photo-upload";
import { notifyWhenInStock, submitReview } from "@/lib/shop-extras.functions";
import { imageFor, isPlaceholder } from "@/lib/placeholders";

export const Route = createFileRoute("/product/$slug")({
  loader: async ({ context, params }) => {
    const data = await context.queryClient.ensureQueryData(productQuery(params.slug));
    if (!data) throw notFound();
    const p = data.product;
    const approved = data.reviews ?? [];
    const rating = approved.length
      ? Math.round((approved.reduce((s: number, r: { rating: number }) => s + r.rating, 0) / approved.length) * 10) / 10
      : 0;
    const photo = (p.images ?? [])[0] ?? "";
    return {
      name: p.name,
      description: p.description ?? "",
      sku: p.sku,
      brand: p.brand ?? "",
      categoryName: p.categoryName ?? "",
      categorySlug: p.category ?? "",
      price: p.price ?? 0,
      stock: p.stock,
      image: photo ? (photo.startsWith("http") ? photo : canonical(photo)) : "",
      rating,
      reviewCount: approved.length,
    };
  },
  head: ({ loaderData, params }) => {
    const name = loaderData?.name ?? params.slug.replace(/-/g, " ");
    const brand = loaderData?.brand ? `${loaderData.brand} ` : "";
    const priceBit = loaderData?.price ? ` at ${formatINR(loaderData.price)}` : "";
    const title = `${brand}${name} — Shaw Traders EV`;
    const description =
      (loaderData?.description || "").slice(0, 155) ||
      `Buy ${brand}${name}${priceBit} at Shaw Traders EV, Bud Bud, Bardhaman. Specifications, vehicle compatibility, warranty and stock availability.`;
    const url = canonical(`/product/${params.slug}`);
    const image = loaderData?.image ?? "";

    const jsonLd: Record<string, unknown> = {
      "@context": "https://schema.org",
      "@type": "Product",
      name,
      description,
      sku: loaderData?.sku,
      ...(loaderData?.brand ? { brand: { "@type": "Brand", name: loaderData.brand } } : {}),
      ...(image ? { image: [image] } : {}),
      ...(loaderData?.categoryName ? { category: loaderData.categoryName } : {}),
      ...(loaderData?.price
        ? {
            offers: {
              "@type": "Offer",
              url,
              priceCurrency: "INR",
              price: String(loaderData.price),
              availability: (loaderData.stock ?? 0) > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
              seller: { "@type": "Organization", name: BUSINESS.name },
            },
          }
        : {}),
      ...(loaderData?.reviewCount
        ? {
            aggregateRating: {
              "@type": "AggregateRating",
              ratingValue: String(loaderData.rating),
              reviewCount: String(loaderData.reviewCount),
            },
          }
        : {}),
    };

    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "product" },
        { property: "og:url", content: url },
        { name: "twitter:card", content: "summary_large_image" },
        ...(image
          ? [
              { property: "og:image", content: image },
              { name: "twitter:image", content: image },
            ]
          : []),
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [
        { type: "application/ld+json", children: JSON.stringify(jsonLd) },
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Home", item: canonical("/") },
              { "@type": "ListItem", position: 2, name: "Shop", item: canonical("/shop") },
              ...(loaderData?.categorySlug && loaderData?.categoryName
                ? [
                    {
                      "@type": "ListItem",
                      position: 3,
                      name: loaderData.categoryName,
                      item: canonical(`/category/${loaderData.categorySlug}`),
                    },
                  ]
                : []),
              { "@type": "ListItem", position: loaderData?.categorySlug ? 4 : 3, name, item: url },
            ],
          }),
        },
      ],
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
  const { vehicle } = useVehicle();
  const navigate = useNavigate();
  const [active, setActive] = useState(0);
  const [zoom, setZoom] = useState(false);
  const [pincode, setPincode] = useState("");
  const [review, setReview] = useState({ rating: "5", title: "", text: "" });
  const [photos, setPhotos] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const [alertContact, setAlertContact] = useState("");
  const [alertDone, setAlertDone] = useState(false);
  const [enquiry, setEnquiry] = useState(false);

  const product = data?.product;
  const mode = useProductOrdering({ orderingMode: product?.orderingMode ?? null, categoryOrderingMode: product?.categoryOrderingMode ?? null });
  const { data: staffMeta } = useQuery({
    queryKey: ["staff-product-meta", product?.id],
    queryFn: () => staffProductMeta({ data: { productId: String(product?.id) } }),
    enabled: Boolean(product?.id),
    staleTime: 60_000,
  });

  useEffect(() => {
    if (product) markViewed(product.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product?.id]);

  if (!data || !product) return null;

  const { reviews, related, boughtTogether, sameVehicle } = data;
  const off = discountPct(product.price, product.mrp);
  const avg = reviews.length ? reviews.reduce((n, r) => n + r.rating, 0) / reviews.length : undefined;
  const waMsg = `Hello ${BUSINESS.name}, I am interested in ${product.name}. Please share availability and final price.`;
  const gallery = product.images.length > 0 ? product.images : [imageFor(product)];
  const delivery = pincode ? deliveryFor(pincode) : null;
  const fits =
    !!vehicle &&
    (product.compatibility ?? []).some((c) => c.toLowerCase().includes(vehicle.model.toLowerCase()));

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

  const pickPhotos = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    try {
      const urls: string[] = [];
      for (const file of Array.from(files).slice(0, 3)) urls.push(await uploadReviewPhoto(product.id, file));
      setPhotos((p) => [...p, ...urls].slice(0, 3));
    } catch {
      toast.error("Could not upload that photo. Please sign in and try again.");
    }
  };

  const sendReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error("Please sign in to write a review");
      void navigate({ to: "/account" });
      return;
    }
    setSending(true);
    const res = await submitReview({
      data: {
        productId: product.id,
        rating: Number(review.rating),
        title: review.title,
        body: review.text,
        photos,
      },
    });
    setSending(false);
    if (!res.ok) {
      toast.error(res.message);
      return;
    }
    setReview({ rating: "5", title: "", text: "" });
    setPhotos([]);
    toast.success(res.message);
  };

  const askAlert = async () => {
    const res = await notifyWhenInStock({ data: { productId: product.id, contact: alertContact } });
    if (!res.ok) {
      toast.error(res.message);
      return;
    }
    setAlertDone(true);
    toast.success(res.message);
  };

  return (
    <div className="container-page py-8">
      <nav aria-label="Breadcrumb" className="mb-5 text-xs text-muted-foreground">
        <Link to="/" className="hover:text-foreground">Home</Link> / <Link to="/shop" className="hover:text-foreground">Shop EV Spare Parts</Link> /{" "}
        {product.category && product.categoryName ? (
          <>
            <Link to="/category/$slug" params={{ slug: product.category }} className="hover:text-foreground">
              {product.categoryName}
            </Link>{" "}
            /{" "}
          </>
        ) : null}
        <span className="text-foreground">{product.name}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-2">
        <div>
          <button
            type="button"
            onClick={() => setZoom(true)}
            className="group relative block aspect-square w-full overflow-hidden rounded-3xl border border-border bg-surface"
            aria-label="Open larger photo"
          >
            <img
              src={gallery[active] ?? gallery[0]}
              alt={product.name}
              className="size-full object-cover transition-transform duration-300 group-hover:scale-110"
              width={800}
              height={800}
            />
            <span className="absolute bottom-3 right-3 grid size-9 place-items-center rounded-full bg-background/90 text-foreground shadow-sm">
              <ZoomIn className="size-4" />
            </span>
          </button>
          {isPlaceholder(product) && (
            <p className="mt-2 text-xs text-muted-foreground">Representative category photo. Contact us for the actual product photo.</p>
          )}
          {gallery.length > 1 && (
            <div className="mt-3 flex gap-2 overflow-x-auto">
              {gallery.map((src, i) => (
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
            {fits && (
              <span className="inline-flex items-center gap-1 rounded-md bg-accent px-1.5 py-0.5 text-[11px] font-semibold text-accent-foreground">
                <CheckCircle2 className="size-3" /> Fits your {vehicle?.model}
              </span>
            )}
          </div>

          <div className="mt-5 rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
            {product.price !== undefined ? (
              <div className="flex flex-wrap items-baseline gap-3">
                <span className="font-display text-3xl font-bold">{formatINR(product.price)}</span>
                {product.mrp && product.mrp > product.price && <span className="text-sm text-muted-foreground line-through">{formatINR(product.mrp)}</span>}
                {off > 0 && <span className="rounded-md bg-sale px-2 py-1 text-xs font-bold text-sale-foreground">{off}% OFF</span>}
              </div>
            ) : (
              <>
                <p className="font-medium">Price on request — ask us and we will quote you today.</p>
                {mode !== "browse" && (
                  <Button className="mt-3 w-full" asChild>
                    <a href={whatsappLink(waMsg)} target="_blank" rel="noreferrer">
                      <MessageCircle className="size-4" /> Ask about this part on WhatsApp
                    </a>
                  </Button>
                )}
              </>
            )}
            <p className={`mt-2 text-sm font-medium ${product.stock > 0 ? "text-primary" : "text-destructive"}`}>
              {product.stock > 0
                ? product.stock <= 3
                  ? `Only ${product.stock} left in stock`
                  : `In stock (${product.stock} available)`
                : "Out of stock"}
            </p>

            {mode === "enquiry" && (
              <div className="mt-5 grid gap-2">
                <Button onClick={() => setEnquiry(true)}>Check availability</Button>
                <Button variant="secondary" asChild>
                  <a href={whatsappLink(waMsg)} target="_blank" rel="noreferrer"><MessageCircle className="size-4" /> Ask on WhatsApp</a>
                </Button>
              </div>
            )}

            {mode === "full" && product.price !== undefined && (
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
              </div>
            )}

            {staffMeta?.staff && (
              <p className="mt-4 rounded-xl border border-dashed border-border bg-surface p-3 text-sm">
                <span className="font-semibold">Shelf location (staff only):</span>{" "}
                {staffMeta.rackLocation || "not recorded yet"}
              </p>
            )}

            <EnquiryDialog product={product} open={enquiry} onOpenChange={setEnquiry} />

            <Button variant="ghost" className="mt-2 w-full" onClick={() => toggleWishlist(product.id)}>
              {lists.wishlist.includes(product.id) ? "Remove from Wishlist" : "Save to Wishlist"}
            </Button>

            {product.stock <= 0 && (
              <div className="mt-4 rounded-xl bg-surface p-4">
                <h3 className="flex items-center gap-2 text-sm font-semibold"><BellRing className="size-4" /> Tell me when it is back</h3>
                {alertDone ? (
                  <p className="mt-2 text-sm text-muted-foreground">We will message you as soon as it is back in stock.</p>
                ) : (
                  <div className="mt-3 flex gap-2">
                    <Input
                      inputMode="numeric"
                      placeholder="Your WhatsApp number"
                      value={alertContact}
                      onChange={(e) => setAlertContact(e.target.value)}
                    />
                    <Button onClick={askAlert}>Notify me</Button>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="mt-5 rounded-2xl border border-border bg-surface p-5">
            <h2 className="font-display text-base font-bold">Delivery to your area</h2>
            <div className="mt-3 flex gap-2">
              <Input
                inputMode="numeric"
                maxLength={6}
                placeholder="6-digit PIN code"
                value={pincode}
                onChange={(e) => setPincode(e.target.value.replace(/\D/g, ""))}
              />
            </div>
            {delivery && (
              <p className="mt-3 rounded-xl bg-background p-3 text-sm">
                <span className="font-semibold">{delivery.label}</span> — {delivery.detail}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="mt-12 grid gap-8 lg:grid-cols-2">
        <div>
          <h2 className="font-display text-xl font-bold">Specifications</h2>
          {(() => {
            const rows: [string, string][] = [
              ...(product.brand ? ([["Brand", product.brand]] as [string, string][]) : []),
              ...(product.voltage ? ([["Voltage", product.voltage]] as [string, string][]) : []),
              ...(product.ah ? ([["Capacity", product.ah]] as [string, string][]) : []),
              ...(product.wattage ? ([["Power", product.wattage]] as [string, string][]) : []),
              ...(product.weight ? ([["Weight", product.weight]] as [string, string][]) : []),
              ...(product.dimensions ? ([["Dimensions", product.dimensions]] as [string, string][]) : []),
              ...(product.warranty ? ([["Warranty", product.warranty]] as [string, string][]) : []),
              ...Object.entries(product.specs ?? {}),
            ];
            return rows.length > 0 ? (
              <dl className="mt-4 overflow-hidden rounded-2xl border border-border">
                {rows.map(([k, v], i) => (
                  <div key={k + i} className={`grid grid-cols-2 gap-4 px-4 py-3 text-sm ${i % 2 ? "bg-surface" : "bg-card"}`}>
                    <dt className="text-muted-foreground">{k}</dt>
                    <dd className="font-medium">{v}</dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">Specifications for this product have not been added yet. Contact us for details.</p>
            );
          })()}

          <h2 className="mt-8 font-display text-xl font-bold">What's in the box</h2>
          <div className="mt-3 flex items-start gap-3 rounded-2xl border border-border bg-card p-4 text-sm">
            <Package className="mt-0.5 size-4 shrink-0 text-primary" />
            <span>{product.boxContents || `1 × ${product.name}, with the standard fittings supplied by the maker.`}</span>
          </div>

          <h2 className="mt-8 font-display text-xl font-bold">Fits these vehicles</h2>
          {product.compatibility && product.compatibility.length > 0 ? (
            <ul className="mt-3 flex flex-wrap gap-2">
              {product.compatibility.map((c) => {
                const mine = vehicle && c.toLowerCase().includes(vehicle.model.toLowerCase());
                return (
                  <li
                    key={c}
                    className={`rounded-full border px-3 py-1.5 text-sm ${mine ? "border-primary bg-accent font-semibold text-accent-foreground" : "border-border bg-card"}`}
                  >
                    {c}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">
              Fitment for this part is not listed yet. Send us your vehicle on WhatsApp and we will confirm.
            </p>
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
          </div>
        </div>
      </div>

      {boughtTogether.length > 0 && (
        <section className="mt-14">
          <SectionHeading title="Often bought together" subtitle="Customers who bought this part also took these." />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {boughtTogether.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        </section>
      )}

      {sameVehicle.length > 0 && (
        <section className="mt-14">
          <SectionHeading title="More parts for the same vehicle" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {sameVehicle.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        </section>
      )}

      <section className="mt-14">
        <SectionHeading title="Customer Reviews" subtitle={reviews.length === 0 ? "No reviews yet for this product." : `${reviews.length} review(s)`} />
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="grid gap-3">
            {reviews.map((r) => (
              <div key={r.id} className="rounded-2xl border border-border bg-card p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="flex text-primary">{Array.from({ length: r.rating }).map((_, i) => <Star key={i} className="size-3.5 fill-current" />)}</span>
                  <span className="text-sm font-semibold">{r.title ?? r.name}</span>
                  {r.verified && <span className="rounded-md bg-accent px-1.5 py-0.5 text-[10px] font-bold text-accent-foreground">Verified purchase</span>}
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{r.body}</p>
                {r.photos && r.photos.length > 0 && (
                  <div className="mt-3 flex gap-2">
                    {r.photos.map((src) => (
                      <img key={src} src={src} alt="Customer photo" loading="lazy" className="size-20 rounded-xl border border-border object-cover" />
                    ))}
                  </div>
                )}
                {r.reply && (
                  <p className="mt-3 rounded-xl bg-surface p-3 text-sm">
                    <span className="font-semibold">{BUSINESS.name}: </span>
                    {r.reply}
                  </p>
                )}
              </div>
            ))}
          </div>
          <form className="rounded-2xl border border-border bg-surface p-5" onSubmit={sendReview}>
            <h3 className="font-display text-base font-bold">Write a review</h3>
            <div className="mt-3 grid gap-3">
              <Select value={review.rating} onValueChange={(v) => setReview({ ...review, rating: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{[5, 4, 3, 2, 1].map((r) => <SelectItem key={r} value={String(r)}>{r} star{r > 1 ? "s" : ""}</SelectItem>)}</SelectContent>
              </Select>
              <Input placeholder="Headline (optional)" value={review.title} onChange={(e) => setReview({ ...review, title: e.target.value })} />
              <Textarea required rows={4} placeholder="Share your experience with this part" value={review.text} onChange={(e) => setReview({ ...review, text: e.target.value })} />
              <div className="grid gap-1.5">
                <Label className="text-xs">Add photos (up to 3)</Label>
                <Input type="file" accept="image/*" multiple onChange={(e) => void pickPhotos(e.target.files)} />
                {photos.length > 0 && (
                  <div className="mt-1 flex gap-2">
                    {photos.map((src) => (
                      <img key={src} src={src} alt="Your photo" className="size-16 rounded-lg border border-border object-cover" />
                    ))}
                  </div>
                )}
              </div>
              <Button type="submit" disabled={sending}>{sending ? "Submitting…" : "Submit review"}</Button>
              <p className="text-xs text-muted-foreground">
                {user
                  ? "Only customers who bought this part can review it. Reviews appear after Shaw Traders approves them."
                  : "Sign in to your account to post a review."}
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

      <nav aria-label="Keep browsing" className="mt-14 flex flex-wrap gap-3 border-t border-border pt-6 text-sm">
        {product.category && product.categoryName && (
          <Link
            to="/category/$slug"
            params={{ slug: product.category }}
            className="rounded-full border border-border bg-card px-4 py-2 font-medium hover:border-primary"
          >
            More {product.categoryName}
          </Link>
        )}
        <Link to="/shop" className="rounded-full border border-border bg-card px-4 py-2 font-medium hover:border-primary">
          Shop EV Spare Parts
        </Link>
        <Link to="/categories" className="rounded-full border border-border bg-card px-4 py-2 font-medium hover:border-primary">
          Part Categories
        </Link>
      </nav>

      <Dialog open={zoom} onOpenChange={setZoom}>
        <DialogContent className="max-w-3xl p-2">
          <img src={gallery[active] ?? gallery[0]} alt={product.name} className="max-h-[80vh] w-full rounded-xl object-contain" />
        </DialogContent>
      </Dialog>
    </div>
  );
}
