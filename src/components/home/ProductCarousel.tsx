import { ProductCard } from "@/components/site/ProductCard";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import type { Product } from "@/lib/catalog";

/** Horizontal, swipeable row of product cards. */
export function ProductCarousel({ items, label }: { items: Product[]; label: string }) {
  if (items.length === 0) return null;
  return (
    <Carousel opts={{ align: "start", slidesToScroll: 1, containScroll: "trimSnaps" }} aria-label={label} className="w-full">
      <CarouselContent className="-ml-3">
        {items.map((p) => (
          <CarouselItem key={p.id} className="basis-1/2 pl-3 sm:basis-1/3 lg:basis-1/4 xl:basis-1/5">
            <ProductCard product={p} />
          </CarouselItem>
        ))}
      </CarouselContent>
      <CarouselPrevious className="left-2 hidden lg:flex" aria-label={`Previous items in ${label}`} />
      <CarouselNext className="right-2 hidden lg:flex" aria-label={`Next items in ${label}`} />
    </Carousel>
  );
}
