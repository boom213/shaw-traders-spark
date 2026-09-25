import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Package } from "lucide-react";
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
      <CarouselContent className="-ml-2">
        {list.map((c) => {
          const Icon = CATEGORY_ICONS[c.slug] ?? Package;
          return (
            <CarouselItem key={c.slug} className="basis-[68%] pl-2 sm:basis-1/3 lg:basis-1/6">
              <Link
                to="/category/$slug"
                params={{ slug: c.slug }}
                className="group block overflow-hidden rounded-xl border border-border bg-card shadow-[var(--shadow-card)] transition-all hover:-translate-y-0.5 hover:border-primary hover:shadow-[var(--shadow-lift)]"
              >
                <div className="relative aspect-[2/1] w-full overflow-hidden bg-surface">
                  <img
                    src={c.imageUrl || placeholderFor(c.slug)}
                    alt={c.name}
                    width={400}
                    height={300}
                    loading="lazy"
                    decoding="async"
                    className="absolute inset-0 size-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                  />
                   <span className="absolute left-2 top-2 grid size-7 place-items-center rounded-md bg-background/90 text-foreground shadow-[var(--shadow-card)]">
                    <Icon className="size-4" strokeWidth={1.5} />
                  </span>
                </div>
                  <div className="flex items-center justify-between gap-2 px-3 py-3">
                    <span className="block truncate text-xs font-semibold leading-snug sm:text-sm">{c.name}</span>
                    <span className="grid size-7 shrink-0 place-items-center rounded-full bg-muted transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                      <ArrowRight className="size-3.5" />
                    </span>
                </div>
              </Link>
            </CarouselItem>
          );
        })}
      </CarouselContent>
      <CarouselPrevious className="left-2 hidden lg:flex" aria-label="Previous categories" />
      <CarouselNext className="right-2 hidden lg:flex" aria-label="Next categories" />
    </Carousel>
  );
}
