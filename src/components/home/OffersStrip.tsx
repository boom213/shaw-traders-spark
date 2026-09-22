import { Link } from "@tanstack/react-router";
import { TicketPercent } from "lucide-react";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { formatINR } from "@/lib/catalog";
import type { OfferCoupon } from "@/lib/catalog.functions";

const describe = (c: OfferCoupon) =>
  c.type === "percent"
    ? `${Math.round(c.value)}% off${c.maxDiscount ? ` up to ${formatINR(c.maxDiscount)}` : ""}`
    : `${formatINR(c.value)} off`;

/** Live coupon codes the shop is running right now. */
export function OffersStrip({ offers }: { offers: OfferCoupon[] }) {
  if (offers.length === 0) return null;

  return (
    <Carousel opts={{ align: "start", containScroll: "trimSnaps" }} aria-label="Live offer codes" className="w-full">
      <CarouselContent className="-ml-3">
        {offers.map((c) => (
          <CarouselItem key={c.code} className="basis-[85%] pl-3 sm:basis-1/2 lg:basis-1/3">
            <Link
              to="/offers"
              className="card-lift flex h-full items-center gap-3 rounded-2xl border border-dashed border-primary/50 bg-surface p-4"
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                <TicketPercent className="size-5" />
              </span>
              <span className="min-w-0">
                <span className="block font-display text-base font-bold">{describe(c)}</span>
                <span className="block truncate text-xs text-muted-foreground">
                  Code {c.code}
                  {c.minOrder > 0 ? ` · on orders above ${formatINR(c.minOrder)}` : ""}
                  {c.expiresAt ? ` · till ${new Date(c.expiresAt).toLocaleDateString("en-IN")}` : ""}
                </span>
              </span>
            </Link>
          </CarouselItem>
        ))}
      </CarouselContent>
      <CarouselPrevious className="hidden lg:flex" aria-label="Previous offers" />
      <CarouselNext className="hidden lg:flex" aria-label="Next offers" />
    </Carousel>
  );
}
