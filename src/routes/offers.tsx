import { createFileRoute } from "@tanstack/react-router";
import { SectionHeading, EmptyCatalogue } from "@/components/site/Empty";
import { ProductCard } from "@/components/site/ProductCard";
import { useStore } from "@/hooks/useStore";
import { CATEGORIES, discountPct, type Product } from "@/lib/catalog";

export const Route = createFileRoute("/offers")({
  head: () => ({
    meta: [
      { title: "Offers & Deals — Shaw Traders EV" },
      { name: "description", content: "Today's deals, best sellers and new arrivals on EV batteries, chargers, motors and accessories at Shaw Traders EV, Bud Bud." },
      { property: "og:title", content: "Offers & Deals — Shaw Traders EV" },
      { property: "og:description", content: "Discounted EV spare parts and accessories from Shaw Traders EV." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
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
  const { state } = useStore();
  const products = state.products;

  const discounted = [...products]
    .filter((p) => discountPct(p.price, p.mrp) > 0)
    .sort((a, b) => discountPct(b.price, b.mrp) - discountPct(a.price, a.mrp));

  const orderCount = new Map<string, number>();
  for (const o of state.orders) for (const i of o.items) orderCount.set(i.productId, (orderCount.get(i.productId) ?? 0) + i.qty);
  const bestSellers = [...products]
    .filter((p) => (orderCount.get(p.id) ?? 0) > 0)
    .sort((a, b) => (orderCount.get(b.id) ?? 0) - (orderCount.get(a.id) ?? 0))
    .slice(0, 8);

  const newArrivals = [...products].sort((a, b) => b.createdAt - a.createdAt).slice(0, 8);

  const nothing = discounted.length === 0 && bestSellers.length === 0 && newArrivals.length === 0;

  return (
    <div className="container mx-auto space-y-10 px-4 py-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold md:text-3xl">Offers & Deals</h1>
        <p className="text-sm text-muted-foreground">Live discounts on EV parts in stock at our Bud Bud counter.</p>
      </header>

      {nothing && <EmptyCatalogue title="No offers running right now" note="Call or WhatsApp us for the latest prices on any part you need." />}

      <Row title="Today's Deals" subtitle="Biggest savings right now" items={discounted.slice(0, 8)} />
      <Row title="Best Sellers" subtitle="Most ordered by our customers" items={bestSellers} />
      <Row title="New Arrivals" subtitle="Latest additions to the shelf" items={newArrivals} />

      {CATEGORIES.map((c) => (
        <Row key={c.slug} title={`${c.name} Deals`} items={discounted.filter((p) => p.category === c.slug).slice(0, 4)} />
      ))}
    </div>
  );
}
