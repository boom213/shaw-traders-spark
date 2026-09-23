import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { BadgeCheck, Handshake, IndianRupee, MessageCircle, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyCatalogue, SectionHeading } from "@/components/site/Empty";
import { ProductCard } from "@/components/site/ProductCard";
import { FindPartsWidget } from "@/components/site/FindPartsWidget";
import { HeroCarousel, heroImageFor } from "@/components/home/HeroCarousel";
import { CategoryCarousel } from "@/components/home/CategoryCarousel";
import { ProductCarousel } from "@/components/home/ProductCarousel";
import { OffersStrip } from "@/components/home/OffersStrip";
import { ScooterStrip } from "@/components/home/ScooterStrip";
import { RecentlyViewedRow } from "@/components/home/RecentlyViewedRow";
import { BUSINESS, canonical, whatsappLink } from "@/lib/catalog";
import { facetsQuery, homeQuery } from "@/lib/queries";

export const Route = createFileRoute("/")({
  loader: ({ context }) => context.queryClient.ensureQueryData(homeQuery()),
  head: ({ loaderData }) => ({
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
      { property: "og:type", content: "website" },
      { property: "og:url", content: canonical("/") },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "canonical", href: canonical("/") },
      { rel: "preload", as: "image", href: heroImageFor(loaderData?.heroSlides?.[0]), fetchPriority: "high" },
    ],

    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "LocalBusiness",
          "@id": `${BUSINESS.site}/#business`,
          name: BUSINESS.name,
          description: "EV parts, batteries, chargers, motors, controllers and accessories in Bud Bud, Bardhaman.",
          url: BUSINESS.site,
          telephone: `+91${BUSINESS.phone}`,
          priceRange: "₹₹",
          address: {
            "@type": "PostalAddress",
            streetAddress: "Defence Colony, Bud Bud",
            addressLocality: "Bud Bud",
            addressRegion: "West Bengal",
            postalCode: "713403",
            addressCountry: "IN",
          },
          areaServed: "India",
          openingHoursSpecification: [
            {
              "@type": "OpeningHoursSpecification",
              dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
              opens: "09:00",
              closes: "20:00",
            },
            { "@type": "OpeningHoursSpecification", dayOfWeek: "Sunday", opens: "10:00", closes: "14:00" },
          ],
        }),
      },
    ],
  }),

  errorComponent: ({ error }) => (
    <div role="alert" className="container-page py-20 text-center text-sm text-muted-foreground">
      {error.message}
    </div>
  ),
  notFoundComponent: () => <div className="container-page py-20 text-center">Page not found.</div>,
  component: Home,
});

const TRUST = [
  { icon: BadgeCheck, label: "Genuine Products" },
  { icon: IndianRupee, label: "Competitive Prices" },
  { icon: Truck, label: "Wide EV Compatibility" },
  { icon: Handshake, label: "Dealer & Retail Support" },
];

function Home() {
  const { data: home } = useSuspenseQuery(homeQuery());
  const { data: facets } = useQuery(facetsQuery());
  const brands = facets?.brands ?? [];
  const highlights = home.categories.slice(0, 6);

  return (
    <div>
      <section className="border-b border-border bg-surface">
        <div className="container-page py-6 lg:py-10">
          <h1 className="sr-only">
            Shaw Traders EV — EV parts, batteries, chargers and electric scooters in Bud Bud, Bardhaman
          </h1>
          <HeroCarousel slides={home.heroSlides} />

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Button size="lg" variant="outline" asChild>
              <a href={whatsappLink(`Hello ${BUSINESS.name}, I need help finding an EV part.`)} target="_blank" rel="noreferrer">
                <MessageCircle className="size-4" /> WhatsApp Us
              </a>
            </Button>
            <span className="text-xs font-semibold text-primary">Bud Bud, Bardhaman · West Bengal</span>
          </div>

          <ul className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {TRUST.map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2.5 text-xs font-medium">
                <Icon className="size-4 shrink-0 text-primary" />
                {label}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {home.offers.length > 0 && (
        <section className="container-page py-6">
          <OffersStrip offers={home.offers} />
        </section>
      )}

      <section className="container-page py-6 lg:py-8">
        <ScooterStrip />
      </section>

      <section className="container-page py-8 lg:py-12">
        <SectionHeading
          title="Shop by Category"
          subtitle="Part categories for electric scooters, e-bikes and e-rickshaws."
          action={
            <Button variant="ghost" asChild>
              <Link to="/categories">View all</Link>
            </Button>
          }
        />
        <CategoryCarousel categories={home.categories} />
      </section>

      <section className="container-page py-4 lg:py-8">
        <SectionHeading
          title="New Arrivals"
          subtitle="Fresh stock added recently by our counter team."
          action={
            <Button variant="ghost" asChild>
              <Link to="/shop">Browse shop</Link>
            </Button>
          }
        />
        {home.latest.length === 0 ? <EmptyCatalogue /> : <ProductCarousel items={home.latest} label="New arrivals" />}
      </section>

      {home.bestSellers.length > 0 && (
        <section className="container-page py-4 lg:py-8">
          <SectionHeading title="Best Sellers" subtitle="Most ordered parts over the last 90 days." />
          <ProductCarousel items={home.bestSellers} label="Best sellers" />
        </section>
      )}

      <RecentlyViewedRow />


      {home.discounted.length > 0 && (
        <section className="container-page py-4 lg:py-8">
          <SectionHeading
            title="Deals of the Day"
            subtitle="Parts currently selling below MRP."
            action={
              <Button variant="ghost" asChild>
                <Link to="/offers">All offers</Link>
              </Button>
            }
          />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {home.discounted.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}

      <section className="container-page py-12 lg:py-16">
        <SectionHeading title="Popular Departments" subtitle="Jump straight to the parts our counter sells the most." />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {highlights.map((cat) => (
            <Link
              key={cat.slug}
              to="/category/$slug"
              params={{ slug: cat.slug }}
              className="card-lift rounded-3xl border border-border bg-card p-5 shadow-[var(--shadow-card)]"
            >
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-display text-lg font-bold">{cat.name}</h3>
                <span className="rounded-full bg-surface px-2.5 py-1 text-xs font-semibold text-primary">
                  {cat.productCount ?? 0} parts
                </span>
              </div>
              <p className="mt-3 line-clamp-2 text-xs text-muted-foreground">
                {cat.blurb || "Contact us for price and availability."}
              </p>
            </Link>
          ))}
        </div>
      </section>

      <section className="container-page py-12 lg:py-16">
        <SectionHeading title="Find Parts for Your EV" subtitle="Pick your vehicle model and the part category you need." />
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
        <SectionHeading title="Brands We Deal In" subtitle="Brands currently listed in our catalogue." />
        {brands.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-surface px-6 py-10 text-center text-sm text-muted-foreground">
            Brand list is being updated. Contact us on WhatsApp to check the brands currently in stock.
          </div>
        ) : (
          <div className="flex flex-wrap gap-3">
            {brands.slice(0, 24).map((b) => (
              <Link
                key={b}
                to="/shop"
                search={{ brand: b }}
                className="rounded-xl border border-border bg-card px-5 py-3 text-sm font-semibold shadow-[var(--shadow-card)] hover:border-primary"
              >
                {b}
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
