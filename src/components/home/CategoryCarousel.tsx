import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Package } from "lucide-react";
import { CATEGORY_ICONS } from "@/components/site/CategoryGrid";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { categoriesQuery } from "@/lib/queries";
import type { Category } from "@/lib/catalog";
import { placeholderFor } from "@/lib/placeholders";

/** Scrollable row of every part category. */
export function CategoryCarousel({ categories }: { categories?: Category[] }) {
  const { data } = useQuery({ ...categoriesQuery(), enabled: !categories });
  const list = categories ?? data ?? [];
  if (list.length === 0) return null;

  return (
    <Carousel opts={{ align: "start", containScroll: "trimSnaps" }} aria-label="Shop by category" className="w-full">
      <CarouselContent className="-ml-3">
        {list.map((c) => {
          const Icon = CATEGORY_ICONS[c.slug] ?? Package;
          return (
            <CarouselItem key={c.slug} className="basis-1/2 pl-3 sm:basis-1/3 lg:basis-1/5 xl:basis-1/6">
              <Link
                to="/category/$slug"
                params={{ slug: c.slug }}
                className="card-lift group block overflow-hidden rounded-2xl border border-border bg-card"
              >
                <div className="relative aspect-[4/3] w-full overflow-hidden bg-surface">
                  <img
                    src={c.imageUrl || placeholderFor(c.slug)}
                    alt={c.name}
                    width={400}
                    height={300}
                    loading="lazy"
                    decoding="async"
                    className="absolute inset-0 size-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                  />
                  <span className="absolute left-2 top-2 grid size-8 place-items-center rounded-lg bg-background/90 text-foreground">
                    <Icon className="size-4" strokeWidth={1.5} />
                  </span>
                </div>
                <div className="p-3">
                  <span className="block truncate text-sm font-semibold leading-snug">{c.name}</span>
                  <span className="block text-xs text-muted-foreground">
                    {c.productCount ? `${c.productCount} parts` : "Shop now"}
                  </span>
                </div>
              </Link>
            </CarouselItem>
          );
        })}
      </CarouselContent>
      <CarouselPrevious className="hidden lg:flex" aria-label="Previous categories" />
      <CarouselNext className="hidden lg:flex" aria-label="Next categories" />
    </Carousel>
  );
}
