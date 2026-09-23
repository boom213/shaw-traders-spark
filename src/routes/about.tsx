import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BadgeCheck, Handshake, Layers, MapPin, Phone, ShieldCheck, Users, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionHeading } from "@/components/site/Empty";
import { BUSINESS, breadcrumbLd, canonical, whatsappLink } from "@/lib/catalog";
import { publicAboutPhotos } from "@/lib/about-gallery-admin.functions";
import { AboutGallery } from "@/components/about/AboutGallery";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About Shaw Traders EV — EV Spare Parts, Bud Bud" },
      { name: "description", content: "Shaw Traders EV supplies electric scooter and e-rickshaw spare parts, batteries, chargers and accessories to owners, mechanics, workshops and dealers from Bud Bud, Bardhaman." },
      { property: "og:title", content: "About Shaw Traders EV" },
      { property: "og:description", content: "EV spare parts supplier serving owners, mechanics, workshops and dealers in Bardhaman, West Bengal." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: canonical("/about") },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: canonical("/about") }],
    scripts: [breadcrumbLd([{ name: "About", path: "/about" }])],
  }),

  component: AboutPage,
});

const VALUES = [
  {
    icon: BadgeCheck,
    title: "Genuine parts",
    text: "Sourced directly from manufacturers and trusted brands — never local duplicates.",
  },
  {
    icon: Handshake,
    title: "Customer-first service",
    text: "Counter staff who actually know EV parts, plus quick help on WhatsApp.",
  },
  {
    icon: Layers,
    title: "One-stop range",
    text: "Our own-brand line alongside every major brand, so you are never sent elsewhere.",
  },
  {
    icon: ShieldCheck,
    title: "Reliability",
    text: "Tested stock, clear warranty terms and dealer-grade support for workshops.",
  },
];

const SERVES = [
  { icon: Users, title: "EV owners", text: "Replacement parts for everyday electric scooter repairs." },
  { icon: Wrench, title: "Mechanics & workshops", text: "Regular supply of fast-moving plastic, metal and electrical parts." },
  { icon: Users, title: "Dealers & retailers", text: "Repeat supply support for shops selling EV spares." },
  { icon: Wrench, title: "Bulk buyers", text: "Quantity enquiries handled directly over phone or WhatsApp." },
];

function AboutPage() {
  const { data: photos } = useQuery({ queryKey: ["about-gallery"], queryFn: () => publicAboutPhotos() });
  const gallery = photos ?? [];

  return (
    <div className="container-page py-10">
      <SectionHeading
        as="h1"
        title="About Shaw Traders EV"
        subtitle="Electric scooter spare parts, batteries, chargers and accessories from Bud Bud, Bardhaman."
      />

      <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
        <div className="grid gap-4 text-sm leading-relaxed text-muted-foreground">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Established excellence</p>
            <h2 className="mt-1 font-display text-2xl font-bold text-foreground">
              A multi-brand EV parts counter, under one roof
            </h2>
          </div>

          <p>
            Shaw Traders EV supplies spare parts and accessories for electric scooters and e-rickshaws. Our range covers
            plastic body parts, lights and indicators, metal parts, brake parts, shockers, electrical parts, hub motors,
            controllers, chargers, hardware and everyday accessories.
          </p>
          <p>
            We import genuine parts directly from manufacturers. Part of that range is made to our own specification and
            quality standards, and sold under the Shaw Traders name; alongside it we stock genuine parts from other
            established EV brands. That means quality-controlled own-brand options and broad brand choice in the same
            shop, instead of a trip to three different counters.
          </p>
          <p>
            Parts are listed by scooter model group, so you can find the panel, light or fitting that matches the vehicle
            you are repairing. Where a price or stock figure is not shown on the website yet, contact us and we will
            confirm the current price and availability.
          </p>

          <div className="mt-2 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
              <h3 className="font-display text-sm font-bold text-foreground">Our mission</h3>
              <p className="mt-1 text-xs">Empowering riders, connecting communities.</p>
              <p className="mt-1 text-xs">
                Bringing reliable, genuine EV parts within easy reach of every rider and workshop in Bardhaman.
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
              <h3 className="font-display text-sm font-bold text-foreground">Our vision</h3>
              <p className="mt-1 text-xs">Clean, accessible mobility for all.</p>
              <p className="mt-1 text-xs">
                Supporting the shift to electric by keeping every EV on the road running well.
              </p>
            </div>
          </div>
        </div>

        <aside className="h-fit rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
          <h3 className="font-display text-base font-bold">Visit us</h3>
          <p className="mt-2 flex gap-2 text-sm text-muted-foreground">
            <MapPin className="mt-0.5 size-4 shrink-0 text-primary" />
            {BUSINESS.address}
          </p>
          <p className="mt-2 flex gap-2 text-sm text-muted-foreground">
            <Phone className="mt-0.5 size-4 shrink-0 text-primary" />
            {BUSINESS.phone}
          </p>
          <div className="mt-4 grid gap-2">
            <Button asChild>
              <a href={whatsappLink(`Hello ${BUSINESS.name}, I would like to know more about the parts you stock.`)} target="_blank" rel="noreferrer">
                WhatsApp us
              </a>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/contact">Contact page</Link>
            </Button>
          </div>
        </aside>
      </div>

      <h2 className="mt-12 font-display text-xl font-bold">Why Shaw Traders EV</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {VALUES.map((v) => (
          <div key={v.title} className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
            <v.icon className="size-5 text-primary" />
            <h3 className="mt-3 font-display text-sm font-bold">{v.title}</h3>
            <p className="mt-1 text-xs text-muted-foreground">{v.text}</p>
          </div>
        ))}
      </div>

      <AboutGallery photos={gallery} />

      <h2 className="mt-16 font-display text-xl font-bold">Who we supply</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {SERVES.map((s) => (
          <div key={s.title} className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
            <s.icon className="size-5 text-primary" />
            <h3 className="mt-3 font-display text-sm font-bold">{s.title}</h3>
            <p className="mt-1 text-xs text-muted-foreground">{s.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
