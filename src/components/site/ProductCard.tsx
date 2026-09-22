import { Link, useNavigate } from "@tanstack/react-router";
import { Heart, Star } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useStore } from "@/hooks/useStore";
import { discountPct, formatINR, type Product } from "@/lib/catalog";
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
  const { lists, addToCart, toggleWishlist } = useStore();
  const navigate = useNavigate();
  const off = discountPct(product.price, product.mrp);
  const wished = lists.wishlist.includes(product.id);
  const inStock = product.stock > 0;

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
    <article className="card-lift group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-card)]">
      <button
        onClick={() => toggleWishlist(product.id)}
        aria-label="Add to wishlist"
        className="absolute right-2.5 top-2.5 z-10 grid size-8 place-items-center rounded-full bg-background/90 text-muted-foreground shadow-sm hover:text-sale"
      >
        <Heart className={cn("size-4", wished && "fill-sale text-sale")} />
      </button>
      {off > 0 && (
        <span className="absolute left-2.5 top-2.5 z-10 rounded-md bg-sale px-2 py-1 text-[11px] font-bold text-sale-foreground">
          {off}% OFF
        </span>
      )}

      <Link to="/product/$slug" params={{ slug: product.slug }} className="block aspect-square overflow-hidden bg-surface">
        <img
          src={imageFor(product)}
          alt={product.name}
          loading="lazy"
          className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
      </Link>

      <div className="flex flex-1 flex-col gap-1.5 p-3.5">
        {product.brand && (
          <span className="text-[11px] font-semibold uppercase tracking-wide text-primary">{product.brand}</span>
        )}
        <Link
          to="/product/$slug"
          params={{ slug: product.slug }}
          className="line-clamp-2 text-sm font-semibold leading-snug hover:text-primary"
        >
          {product.name}
        </Link>
        {product.model && <p className="line-clamp-1 text-xs text-muted-foreground">Fits: {product.model}</p>}

        <div className="mt-1">
          {product.price !== undefined ? (
            <div className="flex flex-wrap items-baseline gap-2">
              <span className="font-display text-lg font-bold">{formatINR(product.price)}</span>
              {product.mrp && product.mrp > product.price && (
                <span className="text-xs text-muted-foreground line-through">{formatINR(product.mrp)}</span>
              )}
            </div>
          ) : (
            <p className="text-sm font-medium text-muted-foreground">Contact us for price and availability.</p>
          )}
        </div>

        <div className="flex items-center justify-end gap-2">
          <span className={cn("text-xs font-medium", inStock ? "text-primary" : "text-destructive")}>
            {inStock ? (product.stock <= 3 ? `Only ${product.stock} left` : "In stock") : "Out of stock"}
          </span>
        </div>

        <div className="mt-auto grid grid-cols-2 gap-2 pt-3">
          <Button variant="outline" size="sm" disabled={!inStock} onClick={add}>
            Add to Cart
          </Button>
          <Button
            size="sm"
            disabled={!inStock}
            onClick={() => {
              if (add()) void navigate({ to: "/checkout" });
            }}
          >
            Buy Now
          </Button>
        </div>
      </div>
    </article>
  );
}
