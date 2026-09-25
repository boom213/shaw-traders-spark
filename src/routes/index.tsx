import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { BadgeCheck, Download, Handshake, IndianRupee, MessageCircle, Truck } from "lucide-react";
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
import { BrandsSection } from "@/components/home/BrandsSection";
import { ScooterSection } from "@/components/home/ScooterSection";
import { homeQuery } from "@/lib/queries";

export const Route = createFileRoute("/")({
  loader: ({ context }) => context.queryClient.ensureQueryData(homeQuery()),
  head: ({ loaderData }) => ({
    meta: [
      { title: "Shaw Traders EV — EV Parts, Batteries & Electric Scooters, Bud Bud" },
      {
        name: "description",
        content:
          "Genuine EV spare parts, batteries, chargers and electric scooters in Bud Bud, Bardhaman. Order online or on WhatsApp, open a trade account, or contact us today.",
      },
      { property: "og:title", content: "Shaw Traders EV — EV Parts, Batteries & Electric Scooters, Bud Bud" },
      {
        property: "og:description",
        content: "Genuine EV spare parts, batteries, chargers and electric scooters in Bud Bud, Bardhaman. Order online or on WhatsApp, open a trade account, or contact us today.",
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
      <section className="border-b border-border">
        <div className="container-page py-6 lg:py-10">
          <div className="mb-5 grid gap-4 lg:mb-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
            <div className="min-w-0">
              <p className="eyebrow">Bud Bud · Bardhaman</p>
              <h1 className="mt-2 font-display text-[1.625rem] font-semibold leading-[1.1] tracking-tight sm:text-4xl lg:text-5xl">
                Shaw Traders EV — Everything Your EV Needs
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground sm:text-base">
                Spare parts, batteries, chargers and electric scooters for every major EV brand.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="lg" asChild>
                <Link to="/find-parts">Find Your EV</Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <a href="/api/public/catalogue" download>
                  <Download className="size-4" /> Download Brochure
                </a>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link to="/shop">Shop All Parts</Link>
              </Button>
            </div>
          </div>
          <HeroCarousel slides={home.heroSlides} />

          <ul className="mt-5 grid grid-cols-2 gap-x-4 gap-y-2 border-t border-border pt-4 sm:grid-cols-4">
            {TRUST.map(({ icon: Icon, label }) => (
              <li key={label} className="flex min-w-0 items-center gap-2 text-xs font-medium text-muted-foreground">
                <Icon className="size-4 shrink-0 text-foreground" strokeWidth={1.5} />
                <span className="truncate">{label}</span>
              </li>
            ))}
          </ul>
          <a
            href={whatsappLink(`Hello ${BUSINESS.name}, I need help finding an EV part.`)}
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-flex min-h-10 items-center gap-2 text-xs font-semibold text-foreground underline-offset-4 hover:underline"
          >
            <MessageCircle className="size-4" strokeWidth={1.5} /> Need help? WhatsApp us
          </a>
        </div>
      </section>

      {home.categories.length > 0 && <section className="container-page py-6 lg:py-10">
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
      </section>}

      <LazySection minHeight="24rem">
        <ScooterSection />
      </LazySection>

      <section className="container-page py-6 lg:py-10">
        <div className="grid gap-4 md:grid-cols-2">
          {[
            {
              title: "For EV Owners & Riders",
              bullets: ["Track your orders anytime", "Save your scooter for 1-tap fitment", "Order updates on WhatsApp"],
              cta: { to: "/account" as const, label: "Sign In / Join" },
            },
            {
              title: "For EV Workshops & Mechanics",
              bullets: ["Wholesale trade pricing", "GST invoices", "Credit terms for approved accounts"],
              cta: { to: "/trade" as const, label: "Apply for Trade Account" },
              extra: true,
            },
          ].map((c) => (
            <div key={c.title} className="flex flex-col rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-card)]">
              <h2 className="font-display text-xl font-semibold tracking-tight">{c.title}</h2>
              <ul className="mt-3 flex-1 space-y-2 text-sm text-muted-foreground">
                {c.bullets.map((b) => (
                  <li key={b} className="flex items-center gap-2">
                    <BadgeCheck className="size-4 shrink-0 text-foreground" strokeWidth={1.5} />
                    {b}
                  </li>
                ))}
              </ul>
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <Button asChild>
                  <Link to={c.cta.to}>{c.cta.label}</Link>
                </Button>
                {c.extra && (
                  <Link to="/bulk" className="inline-flex min-h-10 items-center text-sm font-medium underline-offset-4 hover:underline">
                    One-off bulk order? Request a quote
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {home.offers.length > 0 && (
        <section className="container-page py-6">
          <OffersStrip offers={home.offers} />
        </section>
      )}

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


      <LazySection minHeight="14rem">
        <BrandsSection />
      </LazySection>
    </div>
  );
}
