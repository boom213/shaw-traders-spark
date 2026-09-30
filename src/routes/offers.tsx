import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { queryOptions } from "@tanstack/react-query";
import { SectionHeading, EmptyCatalogue, ProductGridSkeleton } from "@/components/site/Empty";
import { ProductCard } from "@/components/site/ProductCard";
import { offersFeed } from "@/lib/catalog.functions";
import { breadcrumbLd, canonical, type Product } from "@/lib/catalog";

const offersQuery = () => queryOptions({ queryKey: ["offers"], queryFn: () => offersFeed(), staleTime: 60_000 });

export const Route = createFileRoute("/offers")({
  head: () => ({
    meta: [
      { title: "Offers & Deals — Shaw Traders EV" },
      { name: "description", content: "Today's deals, best sellers and new arrivals on EV batteries, chargers, motors and accessories at Shaw Traders EV, Bud Bud." },
      { property: "og:title", content: "Offers & Deals — Shaw Traders EV" },
      { property: "og:description", content: "Discounted EV spare parts and accessories from Shaw Traders EV." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: canonical("/offers") },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: canonical("/offers") }],
    scripts: [breadcrumbLd([{ name: "Offers & Deals", path: "/offers" }])],
  }),

  component: OffersPage,
});

function Row({ title, subtitle, items }: { title: string; subtitle?: string; items: Product[] }) {
  if (items.length === 0) return null;
  return (
    <section className="space-y-4">
      <SectionHeading title={title} {...(subtitle ? { subtitle } : {})} />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {items.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </section>
  );
}

function OffersPage() {
  const { data, isPending } = useQuery(offersQuery());
  const discounted = data?.discounted ?? [];
  const nothing = !isPending && discounted.length === 0 && (data?.bestSellers.length ?? 0) === 0 && (data?.newArrivals.length ?? 0) === 0;

  return (
    <div className="container mx-auto space-y-10 px-4 py-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold md:text-3xl">Offers & Deals</h1>
        <p className="text-sm text-muted-foreground">Live discounts on EV parts in stock at our Bud Bud counter.</p>
      </header>

      {isPending && <ProductGridSkeleton count={8} />}
      {nothing && <EmptyCatalogue title="No offers running right now" note="Call or WhatsApp us for the latest prices on any part you need." />}

      <Row title="Today's Deals" subtitle="Biggest savings right now" items={discounted.slice(0, 8)} />
      <Row title="Best Sellers" subtitle="Most ordered by our customers" items={data?.bestSellers ?? []} />
      <Row title="New Arrivals" subtitle="Latest additions to the shelf" items={data?.newArrivals ?? []} />
      <Row title="More Deals" items={discounted.slice(8, 24)} />
    </div>
  );
}
