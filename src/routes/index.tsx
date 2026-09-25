import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ArrowRight, BadgeCheck, Download, Handshake, IndianRupee, MessageCircle, Tags, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyCatalogue, SectionHeading } from "@/components/site/Empty";
import { ProductCard } from "@/components/site/ProductCard";
import { FindPartsWidget } from "@/components/site/FindPartsWidget";
import { LazySection } from "@/components/site/LazySection";
import { CategoryCarousel } from "@/components/home/CategoryCarousel";
import { ProductCarousel } from "@/components/home/ProductCarousel";
import { OffersStrip } from "@/components/home/OffersStrip";
import { RecentlyViewedRow } from "@/components/home/RecentlyViewedRow";
import { BUSINESS, canonical, whatsappLink } from "@/lib/catalog";
import { BrandsSection } from "@/components/home/BrandsSection";
import { ScooterSection } from "@/components/home/ScooterSection";
import { homeQuery } from "@/lib/queries";
import storefrontHero from "@/assets/hero-storefront-reference.jpg";

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
      { rel: "preload", as: "image", href: storefrontHero, fetchPriority: "high" },
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
      <section className="border-b border-border bg-background">
        <div className="container-page py-3 sm:py-4">
          <div className="relative min-h-[32rem] overflow-hidden rounded-xl bg-surface sm:min-h-[34rem] lg:min-h-[25.5rem]">
            <img src={storefrontHero} alt="Electric scooter and genuine EV parts from Shaw Traders EV" className="absolute inset-0 size-full object-cover object-[64%_center]" width={1600} height={720} fetchPriority="high" />
            <div className="absolute inset-0 bg-background/80 lg:bg-[linear-gradient(90deg,var(--background)_0%,color-mix(in_oklch,var(--background)_96%,transparent)_34%,color-mix(in_oklch,var(--background)_48%,transparent)_53%,transparent_70%)]" />
            <div className="relative flex min-h-[32rem] max-w-[42rem] flex-col justify-center px-5 py-8 sm:min-h-[34rem] sm:px-10 lg:min-h-[25.5rem] lg:px-16">
              <p className="mb-4 inline-flex w-fit items-center gap-2 rounded-full bg-accent px-3 py-1.5 text-[11px] font-semibold uppercase text-accent-foreground">
                <span className="size-1.5 rounded-full bg-primary" /> Trusted EV parts showroom
              </p>
              <h1 className="max-w-xl font-display text-[2.35rem] font-bold leading-[1.02] sm:text-5xl lg:text-[3.25rem]">
                Shaw Traders EV —<br />Everything Your<br /><span className="text-primary">EV Needs</span>
              </h1>
              <p className="mt-4 max-w-lg text-sm leading-relaxed text-muted-foreground sm:text-base">
                Genuine spare parts, batteries, chargers and electric scooters for every major EV brand.
              </p>
              <ul className="mt-6 grid max-w-xl grid-cols-2 gap-3 sm:grid-cols-4">
                {TRUST.map(({ icon: Icon, label }) => (
                  <li key={label} className="flex items-center gap-2 text-[11px] font-semibold sm:text-xs">
                    <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground"><Icon className="size-4" strokeWidth={1.7} /></span>
                    <span>{label}</span>
                  </li>
                ))}
              </ul>
               <div className="mt-5 grid max-w-xl gap-2 sm:grid-cols-2 lg:grid-cols-3">
                <Button size="lg" className="w-full" asChild><Link to="/shop">Shop EV Parts <ArrowRight /></Link></Button>
                 <Button size="lg" variant="outline" className="w-full bg-background/90" asChild><Link to="/brand"><Tags /> Browse EV Brands</Link></Button>
                <Button size="lg" variant="outline" className="w-full bg-background/90 sm:col-span-2 lg:col-span-1" asChild><a href="/api/public/catalogue" download><Download /> Brochure</a></Button>
              </div>
              <a href={whatsappLink(`Hello ${BUSINESS.name}, I need help finding an EV part.`)} target="_blank" rel="noreferrer" className="mt-4 inline-flex min-h-10 w-fit items-center gap-2 text-xs font-semibold hover:underline">
                <MessageCircle className="size-4 text-whatsapp" /> Need help? WhatsApp us
              </a>
            </div>
          </div>
        </div>
      </section>

      {home.categories.length > 0 && (
        <section className="container-page py-5 lg:py-7">
          <div className="mb-5 text-center">
            <p className="eyebrow">Shop by category</p>
            <div className="relative mt-1">
              <h2 className="font-display text-2xl font-bold sm:text-3xl">Everything You Need for Your EV</h2>
              <Link to="/categories" className="mt-2 inline-block text-xs font-semibold text-primary hover:underline sm:absolute sm:right-0 sm:top-2">View all →</Link>
            </div>
            <span className="mx-auto mt-2 block h-0.5 w-8 bg-primary" />
          </div>
          <CategoryCarousel categories={home.categories} />
        </section>
      )}

      <BrandsSection />

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


    </div>
  );
}
