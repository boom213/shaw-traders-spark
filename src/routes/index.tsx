import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { BadgeCheck, Handshake, IndianRupee, MessageCircle, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyCatalogue, SectionHeading } from "@/components/site/Empty";
import { ProductCard } from "@/components/site/ProductCard";
import { FindPartsWidget } from "@/components/site/FindPartsWidget";
import { LazySection } from "@/components/site/LazySection";
import { HeroCarousel, heroImageFor } from "@/components/home/HeroCarousel";
import { CategoryCarousel } from "@/components/home/CategoryCarousel";
import { ProductCarousel } from "@/components/home/ProductCarousel";
import { OffersStrip } from "@/components/home/OffersStrip";
import { RecentlyViewedRow } from "@/components/home/RecentlyViewedRow";
import { BUSINESS, canonical, whatsappLink } from "@/lib/catalog";
import { ScooterSection } from "@/components/home/ScooterSection";
import { BrandsSection } from "@/components/home/BrandsSection";
import { homeQuery } from "@/lib/queries";

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
          image: BUSINESS.banner,
          logo: BUSINESS.logo,
          parentOrganization: { "@id": `${BUSINESS.site}/#organization` },
          ...(BUSINESS.sameAs.length > 0 ? { sameAs: BUSINESS.sameAs } : {}),
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

  return (
    <div>
      <section className="border-b border-border bg-surface">
        <div className="container-page py-5 lg:py-10">
          <div className="mb-4 lg:mb-6">
            <h1 className="font-display text-2xl font-bold leading-tight tracking-tight sm:text-3xl lg:text-4xl">
              Shaw Traders EV — Everything Your EV Needs
            </h1>
            <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground sm:text-base">
              Spare parts, batteries, chargers and electric scooters for every major EV brand — one shop in Bud Bud, Bardhaman.
            </p>
          </div>
          <HeroCarousel slides={home.heroSlides} />

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Button variant="outline" asChild>
              <a href={whatsappLink(`Hello ${BUSINESS.name}, I need help finding an EV part.`)} target="_blank" rel="noreferrer">
                <MessageCircle className="size-4" /> WhatsApp Us
              </a>
            </Button>
            <span className="text-xs font-semibold text-primary">Bud Bud, Bardhaman · West Bengal</span>
          </div>

          <ul className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
            {TRUST.map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-xs font-medium">
                <Icon className="size-4 shrink-0 text-primary" />
                {label}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="container-page py-6 lg:py-10">
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

      {home.offers.length > 0 && (
        <section className="container-page py-6">
          <OffersStrip offers={home.offers} />
        </section>
      )}

      <LazySection minHeight="24rem">
        <ScooterSection />
      </LazySection>

      <LazySection minHeight="24rem">
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
      </LazySection>

      {home.bestSellers.length > 0 && (
        <LazySection minHeight="24rem">
          <section className="container-page py-4 lg:py-8">
            <SectionHeading title="Best Sellers" subtitle="Most ordered parts over the last 90 days." />
            <ProductCarousel items={home.bestSellers} label="Best sellers" />
          </section>
        </LazySection>
      )}

      <LazySection minHeight="0rem">
        <RecentlyViewedRow />
      </LazySection>

      {home.discounted.length > 0 && (
        <LazySection minHeight="24rem">
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
        </LazySection>
      )}


      <LazySection minHeight="18rem">
        <section className="container-page py-12 lg:py-16">
          <SectionHeading title="Find Parts for Your EV" subtitle="Pick your vehicle model and the part category you need." />
          <FindPartsWidget />
        </section>
      </LazySection>

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

      <LazySection minHeight="14rem">
        <BrandsSection />
      </LazySection>
    </div>
  );
}
