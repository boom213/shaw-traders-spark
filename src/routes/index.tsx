import { createFileRoute, Link } from "@tanstack/react-router";
import { BadgeCheck, Handshake, IndianRupee, MessageCircle, Truck } from "lucide-react";
import heroImg from "@/assets/hero-ev.jpg";
import { Button } from "@/components/ui/button";
import { CategoryGrid } from "@/components/site/CategoryGrid";
import { EmptyCatalogue, SectionHeading } from "@/components/site/Empty";
import { ProductCard } from "@/components/site/ProductCard";
import { FindPartsWidget } from "@/components/site/FindPartsWidget";
import { useStore } from "@/hooks/useStore";
import { BUSINESS, CATEGORIES, whatsappLink } from "@/lib/catalog";
import { imageFor } from "@/lib/placeholders";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Shaw Traders EV — EV Parts, Batteries & Accessories | Bud Bud" },
      {
        name: "description",
        content:
          "Buy EV batteries, chargers, motors, controllers and body parts from Shaw Traders EV, Bud Bud, Bardhaman. Retail, dealer and bulk supply with WhatsApp ordering.",
      },
      { property: "og:title", content: "Shaw Traders EV — Everything Your EV Needs" },
      {
        property: "og:description",
        content: "Batteries, chargers, motors, controllers, body parts and EV accessories under one roof.",
      },
    ],
  }),
  component: Home,
});

const TRUST = [
  { icon: BadgeCheck, label: "Genuine Products" },
  { icon: IndianRupee, label: "Competitive Prices" },
  { icon: Truck, label: "Wide EV Compatibility" },
  { icon: Handshake, label: "Dealer & Retail Support" },
];

const HIGHLIGHTS = ["ev-batteries", "chargers", "motors", "body-parts", "lighting", "brake-parts"];

function Home() {
  const { state } = useStore();
  const products = state.products;

  return (
    <div>
      <section className="border-b border-border bg-surface">
        <div className="container-page grid items-center gap-8 py-10 lg:grid-cols-2 lg:py-16">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1 text-xs font-semibold text-primary">
              Bud Bud, Bardhaman · West Bengal
            </span>
            <h1 className="mt-4 font-display text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
              Everything Your EV Needs. Under One Roof.
            </h1>
            <p className="mt-4 max-w-lg text-base text-muted-foreground">
              Batteries, chargers, motors, controllers, body parts and EV accessories.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Button size="lg" asChild>
                <Link to="/shop">Shop Products</Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <a href={whatsappLink(`Hello ${BUSINESS.name}, I need help finding an EV part.`)} target="_blank" rel="noreferrer">
                  <MessageCircle className="size-4" /> WhatsApp Us
                </a>
              </Button>
            </div>
            <ul className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {TRUST.map(({ icon: Icon, label }) => (
                <li key={label} className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2.5 text-xs font-medium">
                  <Icon className="size-4 shrink-0 text-primary" />
                  {label}
                </li>
              ))}
            </ul>
          </div>
          <div className="overflow-hidden rounded-3xl border border-border bg-background shadow-[var(--shadow-lift)]">
            <img src={heroImg} alt="Electric scooter with EV battery pack, charger, hub motor and controller" width={1600} height={1008} className="w-full" />
          </div>
        </div>
      </section>

      <section className="container-page py-12 lg:py-16">
        <SectionHeading
          title="Shop by Category"
          subtitle="Fourteen part categories for electric scooters, e-bikes and e-rickshaws."
          action={
            <Button variant="ghost" asChild>
              <Link to="/categories">View all</Link>
            </Button>
          }
        />
        <CategoryGrid limit={10} />
      </section>

      <section className="container-page py-4 lg:py-8">
        <SectionHeading
          title="Shop All Products"
          subtitle="Fresh stock added regularly by our counter team."
          action={
            <Button variant="ghost" asChild>
              <Link to="/shop">Browse shop</Link>
            </Button>
          }
        />
        {products.length === 0 ? (
          <EmptyCatalogue />
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {products.slice(0, 8).map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </section>

      <section className="container-page py-12 lg:py-16">
        <SectionHeading title="Popular Departments" subtitle="Jump straight to the parts our counter sells the most." />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {HIGHLIGHTS.map((slug) => {
            const cat = CATEGORIES.find((c) => c.slug === slug);
            if (!cat) return null;
            const items = products.filter((p) => p.category === slug);
            return (
              <Link
                key={slug}
                to="/category/$slug"
                params={{ slug }}
                className="card-lift rounded-3xl border border-border bg-card p-5 shadow-[var(--shadow-card)]"
              >
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-display text-lg font-bold">{cat.name}</h3>
                  <span className="rounded-full bg-surface px-2.5 py-1 text-xs font-semibold text-primary">{items.length} parts</span>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2">
                  {items.slice(0, 3).map((p) => (
                    <img key={p.id} src={imageFor(p)} alt={p.name} loading="lazy" className="aspect-square w-full rounded-xl object-cover" />
                  ))}
                </div>
                <p className="mt-3 line-clamp-2 text-xs text-muted-foreground">
                  {items.slice(0, 3).map((p) => p.name).join(" · ") || "Contact us for price and availability."}
                </p>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="container-page py-12 lg:py-16">
        <SectionHeading title="Find Parts for Your EV" subtitle="Pick your vehicle brand, model and the part category you need." />
        <FindPartsWidget />
      </section>

      <section className="container-page pb-12 lg:pb-16">
        <div className="grid gap-6 rounded-3xl border border-border bg-ink px-6 py-10 text-background sm:px-10 lg:grid-cols-[1.4fr_1fr] lg:items-center">
          <div>
            <h2 className="font-display text-3xl font-bold tracking-tight">Need EV Parts in Bulk?</h2>
            <p className="mt-3 max-w-xl text-sm text-background/70">
              Special support for dealers, workshops, mechanics and bulk buyers.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 lg:justify-end">
            <Button size="lg" asChild>
              <Link to="/bulk">Request Bulk Quote</Link>
            </Button>
            <Button size="lg" variant="outline" className="border-background/30 bg-transparent text-background hover:bg-background/10 hover:text-background" asChild>
              <a href={`tel:${BUSINESS.phone}`}>Contact Sales</a>
            </Button>
          </div>
        </div>
      </section>

      <section className="container-page pb-16">
        <SectionHeading title="Brands We Deal In" subtitle="Maintained by Shaw Traders from the admin panel." />
        {state.brands.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-surface px-6 py-10 text-center text-sm text-muted-foreground">
            Brand list is being updated. Contact us on WhatsApp to check the brands currently in stock.
          </div>
        ) : (
          <div className="flex flex-wrap gap-3">
            {state.brands.map((b) => (
              <span key={b} className="rounded-xl border border-border bg-card px-5 py-3 text-sm font-semibold shadow-[var(--shadow-card)]">
                {b}
              </span>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
