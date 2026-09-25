import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { SectionHeading } from "@/components/site/Empty";
import { facetsQuery } from "@/lib/queries";

/**
 * Brand list at the very bottom of the home page. Owns its own facets query so
 * the request is deferred until a visitor scrolls this far.
 */
export function BrandsSection() {
  const { data: facets } = useQuery(facetsQuery());
  const brands = facets?.brands ?? [];

  return (
    <section className="container-page py-8 lg:py-12">
      <SectionHeading title="Parts for Major EV Brands" subtitle="Find genuine parts and accessories for the electric scooter and bike brands we stock." action={<Link to="/brand" className="text-sm font-semibold text-primary hover:underline">View all brands →</Link>} />
      {brands.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-surface px-6 py-10 text-center text-sm text-muted-foreground">
          Brand list is being updated. Contact us on WhatsApp to check the brands currently in stock.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {brands.slice(0, 24).map((b) => (
            <Link
              key={b}
              to="/shop"
              search={{ brand: b }}
              className="grid min-h-20 place-items-center rounded-lg border border-border bg-card px-4 py-3 text-center font-display text-base font-semibold shadow-[var(--shadow-card)] transition-colors hover:border-primary"
            >
              {b}
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
