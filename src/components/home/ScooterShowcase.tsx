import { Link } from "@tanstack/react-router";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { Button } from "@/components/ui/button";
import { formatINR } from "@/lib/catalog";
import type { VehicleModel } from "@/lib/vehicles";

/** Swipeable row of electric scooter models for the home page. */
export function ScooterShowcase({ models }: { models: VehicleModel[] }) {
  if (models.length === 0) return null;
  return (
    <Carousel opts={{ align: "start", slidesToScroll: 1, containScroll: "trimSnaps" }} aria-label="Electric scooters" className="w-full">
      <CarouselContent className="-ml-3">
        {models.map((v) => (
          <CarouselItem key={v.id} className="basis-4/5 pl-3 sm:basis-1/2 lg:basis-1/3">
            <div className="h-full overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-card)]">
              <Link to="/scooters/$slug" params={{ slug: v.slug }} className="block">
                <div className="aspect-4/3 w-full overflow-hidden bg-surface">
                  {v.images[0] ? (
                    <img src={v.images[0]} alt={v.name} width={640} height={480} loading="lazy" className="size-full object-cover" />
                  ) : (
                    <div className="grid size-full place-items-center text-sm text-muted-foreground">Photo coming soon</div>
                  )}
                </div>
              </Link>
              <div className="space-y-2 p-4">
                {v.extraSpecs?.['demo'] === "true" && (
                  <span className="inline-flex rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-semibold text-amber-900">
                    Sample data
                  </span>
                )}
                {v.brand && <p className="text-xs uppercase tracking-wide text-muted-foreground">{v.brand}</p>}
                <h3 className="font-display text-lg font-bold leading-tight">
                  <Link to="/scooters/$slug" params={{ slug: v.slug }}>
                    {v.name}
                  </Link>
                </h3>
                <p className="text-sm text-muted-foreground">
                  {[v.specs.certifiedRange && `${v.specs.certifiedRange} range`, v.specs.topSpeed && `${v.specs.topSpeed} top speed`]
                    .filter(Boolean)
                    .join(" · ") || "Full specifications on the model page"}
                </p>
                <p className="pt-1">
                  <span className="font-display text-xl font-bold">
                    {v.price.onRoad > 0 ? formatINR(v.price.onRoad) : "Price on request"}
                  </span>
                  {v.price.onRoad > 0 && <span className="ml-1 text-xs text-muted-foreground">on-road</span>}
                </p>
                <Button asChild size="sm" className="mt-1 w-full">
                  <Link to="/scooters/$slug" params={{ slug: v.slug }}>
                    View & book
                  </Link>
                </Button>
              </div>
            </div>
          </CarouselItem>
        ))}
      </CarouselContent>
      <CarouselPrevious className="hidden lg:flex" aria-label="Previous scooter" />
      <CarouselNext className="hidden lg:flex" aria-label="Next scooter" />
    </Carousel>
  );
}
