import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { SectionHeading } from "@/components/site/Empty";
import { ScooterShowcase } from "@/components/home/ScooterShowcase";
import { vehiclesQuery } from "@/lib/queries";

/**
 * Electric scooter row. Owns its own query so the request only fires once this
 * section is mounted (it sits below the fold on phones).
 */
export function ScooterSection() {
  const { data: scooters } = useQuery(vehiclesQuery());
  const hasScooters = (scooters?.length ?? 0) > 0;

  return (
    <section className="border-y border-border bg-muted/30">
      <div className="container-page py-8 lg:py-12">
      <SectionHeading
        title="Electric Scooters at Our Showroom"
        subtitle="Explore complete electric scooters in person at Shaw Traders EV, Bud Bud. Compare models, specifications and on-road prices."
        action={
          <Button variant="ghost" asChild>
            <Link to="/scooters">Explore scooters</Link>
          </Button>
        }
      />
      {hasScooters ? (
        <ScooterShowcase models={scooters ?? []} />
      ) : (
        <div className="grid overflow-hidden rounded-lg border border-border bg-card md:grid-cols-[minmax(0,1.25fr)_minmax(18rem,0.75fr)]">
          <img
            src="/demo/scooter-1.jpg"
            alt="Electric scooter available at Shaw Traders EV showroom"
            width={960}
            height={640}
            loading="lazy"
            className="aspect-[16/10] size-full object-cover md:aspect-auto"
          />
          <div className="flex flex-col justify-center p-5 sm:p-7">
            <p className="eyebrow">Bud Bud showroom</p>
            <h3 className="mt-2 font-display text-xl font-semibold sm:text-2xl">See the right scooter before you decide</h3>
            <p className="mt-2 text-sm text-muted-foreground">Visit our showroom for current models, pricing and buying guidance.</p>
            <Button asChild className="mt-5 w-fit">
              <Link to="/contact">Plan a showroom visit</Link>
            </Button>
          </div>
        </div>
      )}
      </div>
    </section>
  );
}
