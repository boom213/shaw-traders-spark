import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { LayoutGrid } from "lucide-react";
import { categoryIcon } from "@/components/site/category-icons";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { categoriesQuery } from "@/lib/queries";
import type { Category } from "@/lib/catalog";

/** Scrollable row of every part category. */
export function CategoryCarousel({ categories, limit, showOthers = false }: { categories?: Category[]; limit?: number; showOthers?: boolean }) {
  const { data } = useQuery({ ...categoriesQuery(), enabled: !categories });
  const all = categories ?? data ?? [];
  const list = limit === undefined ? all : all.slice(0, limit);
  if (list.length === 0) return null;

  return (
    <Carousel opts={{ align: "start", containScroll: "trimSnaps" }} aria-label="Shop by category" className="w-full px-10 sm:px-12 lg:px-0">
      <CarouselContent className="ml-0 gap-3 lg:flex-wrap lg:justify-center">
        {list.map((c) => {
          const Icon = categoryIcon(c);
          return (
            <CarouselItem key={c.slug} className="basis-32 pl-0 sm:basis-36 lg:basis-36">
              <Link
                to="/category/$slug"
                params={{ slug: c.slug }}
                className="group flex aspect-square w-full flex-col items-center justify-center rounded-lg border border-border bg-card p-3 text-center shadow-[var(--shadow-card)] transition-[border-color,box-shadow,transform] duration-300 hover:-translate-y-1 hover:border-primary hover:shadow-[var(--shadow-lift)] motion-reduce:transform-none motion-reduce:transition-none"
              >
                <Icon className="mb-3 size-8 text-foreground transition-colors group-hover:text-primary" strokeWidth={1.5} />
                <span className="line-clamp-2 text-xs font-extrabold uppercase leading-snug text-foreground">{c.name}</span>
              </Link>
            </CarouselItem>
          );
        })}
        {showOthers && (
          <CarouselItem className="basis-32 pl-0 sm:basis-36 lg:basis-36">
            <Link
              to="/categories"
              className="group flex aspect-square w-full flex-col items-center justify-center rounded-lg border border-foreground bg-foreground p-3 text-center text-background shadow-[var(--shadow-card)] transition-[background-color,border-color,box-shadow,transform] duration-300 hover:-translate-y-1 hover:border-primary hover:bg-primary hover:text-primary-foreground hover:shadow-[var(--shadow-lift)] motion-reduce:transform-none motion-reduce:transition-none"
            >
              <LayoutGrid className="mb-3 size-8" strokeWidth={1.5} />
              <span className="text-xs font-extrabold uppercase leading-snug">Others</span>
            </Link>
          </CarouselItem>
        )}
      </CarouselContent>
      <CarouselPrevious className="left-0 lg:hidden" aria-label="Previous categories" />
      <CarouselNext className="right-0 lg:hidden" aria-label="Next categories" />
    </Carousel>
  );
}
