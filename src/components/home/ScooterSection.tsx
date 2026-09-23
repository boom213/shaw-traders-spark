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
  if ((scooters?.length ?? 0) === 0) return null;

  return (
    <section className="container-page py-8 lg:py-12">
      <SectionHeading
        title="Electric Scooters"
        subtitle="Full specifications, itemised on-road price and booking with a small token amount."
        action={
          <Button variant="ghost" asChild>
            <Link to="/scooters">View all scooters</Link>
          </Button>
        }
      />
      <ScooterShowcase models={scooters ?? []} />
    </section>
  );
}
