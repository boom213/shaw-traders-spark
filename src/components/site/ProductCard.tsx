import { Link, useNavigate } from "@tanstack/react-router";
import { CheckCircle2, Heart, Star } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { EnquiryDialog } from "@/components/site/EnquiryDialog";
import { useStore } from "@/hooks/useStore";
import { useT } from "@/lib/i18n";
import { useProductOrdering } from "@/hooks/useOrderingMode";
import { useVehicle } from "@/hooks/useVehicle";
import { discountPct, formatINR, whatsappLink, type Product } from "@/lib/catalog";
import { imageFor } from "@/lib/placeholders";
import { cn } from "@/lib/utils";

export function ProductRating({ rating, count }: { rating?: number; count?: number }) {
  if (!rating || !count) return <span className="text-xs text-muted-foreground">No reviews yet</span>;
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-accent px-1.5 py-0.5 text-xs font-semibold text-accent-foreground">
      <Star className="size-3 fill-current" /> {rating.toFixed(1)} <span className="font-normal">({count})</span>
    </span>
  );
}

export function ProductCard({ product }: { product: Product }) {
  const t = useT();
  const { lists, addToCart, toggleWishlist } = useStore();
  const { vehicle } = useVehicle();
  const navigate = useNavigate();
  const mode = useProductOrdering(product);
  const [enquiry, setEnquiry] = useState(false);
  const off = discountPct(product.price, product.mrp);
  const wished = lists.wishlist.includes(product.id);
  const inStock = product.stock > 0;
  const fits =
    !!vehicle &&
    (product.compatibility ?? []).some(
      (c) => c.toLowerCase() === vehicle.model.toLowerCase() || c.toLowerCase().includes(vehicle.model.toLowerCase()),
    );

  const add = () => {
    if (!inStock) {
      toast.error("This part is out of stock right now");
      return false;
    }
    const ok = addToCart(product.id, 1, product.stock);
    if (!ok) toast.error(`Only ${product.stock} in stock`);
    else toast.success("Added to cart");
    return ok;
  };

  return (
    <article className="card-lift group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card">
      <button
        onClick={() => toggleWishlist(product.id)}
        aria-label="Add to wishlist"
        className="absolute right-2 top-2 z-10 grid size-10 place-items-center rounded-full bg-background/90 text-muted-foreground hover:text-sale"
      >
        <Heart className={cn("size-4", wished && "fill-sale text-sale")} strokeWidth={1.75} />
      </button>
      {off > 0 && (
        <span className="absolute left-2.5 top-2.5 z-10 rounded-md bg-sale px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-sale-foreground">
          −{off}%
        </span>
      )}

      <Link to="/product/$slug" params={{ slug: product.slug }} className="block aspect-square overflow-hidden bg-surface">
        <img
          src={imageFor(product)}
          alt={product.name}
          loading="lazy"
          decoding="async"
          width={480}
          height={480}
          className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
        />
      </Link>

      <div className="flex flex-1 flex-col gap-1 p-3 sm:p-3.5">
        {product.brand && (
          <span className="eyebrow truncate">{product.brand}</span>
        )}
        <Link
          to="/product/$slug"
          params={{ slug: product.slug }}
          className="line-clamp-2 min-h-[2.5rem] text-sm font-medium leading-5 hover:text-primary"
        >
          {product.name}
        </Link>
        {fits ? (
          <span className="inline-flex w-fit max-w-full items-center gap-1 truncate rounded-md bg-accent px-1.5 py-0.5 text-[11px] font-semibold text-accent-foreground">
            <CheckCircle2 className="size-3 shrink-0" /> <span className="truncate">Fits your {vehicle?.model}</span>
          </span>
        ) : (
          product.model && <p className="line-clamp-1 text-xs text-muted-foreground">Fits: {product.model}</p>
        )}

        <div className="mt-2 flex flex-wrap items-end justify-between gap-x-2 gap-y-1">
          {product.price !== undefined ? (
            <div className="min-w-0">
              <span className="block font-display text-xl font-semibold tabular-nums leading-none tracking-tight">{formatINR(product.price)}</span>
              {product.mrp && product.mrp > product.price && (
                <span className="text-xs tabular-nums text-muted-foreground line-through">{formatINR(product.mrp)}</span>
              )}
            </div>
          ) : (
            <p className="basis-full text-sm font-semibold leading-snug text-foreground">
              {t("product.priceOnRequest")}
            </p>
          )}
          <span className={cn("shrink-0 text-[11px] font-medium", inStock ? "text-muted-foreground" : "text-destructive")}>
            {inStock ? (product.stock <= 3 ? `Only ${product.stock} left` : t("product.inStock")) : t("product.outOfStock")}
          </span>
        </div>

        {mode === "browse" ? null : mode === "enquiry" ? (
          <div className="mt-auto grid pt-3">
            <Button size="sm" className="h-10 sm:h-9" onClick={() => setEnquiry(true)}>
              Check availability
            </Button>
          </div>
        ) : product.price === undefined || !inStock ? (
          <div className="mt-auto grid gap-2 pt-3">
            <Button size="sm" className="h-10 sm:h-9" onClick={() => setEnquiry(true)}>
              Check availability
            </Button>
            <Button size="sm" variant="outline" className="h-10 px-2 text-xs sm:h-9" asChild>
              <a
                href={whatsappLink(`Hello, please share the price and availability of ${product.name} (${product.sku}).`)}
                target="_blank"
                rel="noreferrer"
              >
                {t("product.askPrice")}
              </a>
            </Button>
          </div>
        ) : (
        <div className="mt-auto grid grid-cols-1 gap-2 pt-3 sm:grid-cols-2">
          <Button variant="outline" size="sm" className="h-10 w-full sm:h-9" disabled={!inStock} onClick={add}>
            {t("product.addToCart")}
          </Button>
          <Button
            size="sm"
            className="h-10 w-full sm:h-9"
            disabled={!inStock}
            onClick={() => {
              if (add()) void navigate({ to: "/checkout" });
            }}
          >
            {t("product.buyNow")}
          </Button>
        </div>
        )}
      </div>
      <EnquiryDialog product={product} open={enquiry} onOpenChange={setEnquiry} />
    </article>
  );
}
