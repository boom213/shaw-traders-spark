import { createFileRoute, Link } from "@tanstack/react-router";
import { MapPin, Phone, Users, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionHeading } from "@/components/site/Empty";
import { BUSINESS, breadcrumbLd, canonical, whatsappLink } from "@/lib/catalog";

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

const SERVES = [
  { icon: Users, title: "EV owners", text: "Replacement parts for everyday electric scooter repairs." },
  { icon: Wrench, title: "Mechanics & workshops", text: "Regular supply of fast-moving plastic, metal and electrical parts." },
  { icon: Users, title: "Dealers & retailers", text: "Repeat supply support for shops selling EV spares." },
  { icon: Wrench, title: "Bulk buyers", text: "Quantity enquiries handled directly over phone or WhatsApp." },
];

function AboutPage() {
  return (
    <div className="container-page py-10">
      <SectionHeading
        as="h1"
        title="About Shaw Traders EV"
        subtitle="Electric scooter spare parts, batteries, chargers and accessories from Bud Bud, Bardhaman."
      />

      <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
        <div className="grid gap-4 text-sm leading-relaxed text-muted-foreground">
          <p>
            Shaw Traders EV supplies spare parts and accessories for electric scooters and e-rickshaws. Our range covers
            plastic body parts, lights and indicators, metal parts, brake parts, shockers, electrical parts, hub motors,
            controllers, chargers, hardware and everyday accessories.
          </p>
          <p>
            Parts are listed by scooter model group, so you can find the panel, light or fitting that matches the vehicle
            you are repairing. Where a price or stock figure is not shown on the website yet, contact us and we will
            confirm the current price and availability.
          </p>
          <p>
            We serve walk-in customers at our counter as well as mechanics, workshops, dealers and bulk buyers who order
            over phone and WhatsApp.
          </p>
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

      <h2 className="mt-12 font-display text-xl font-bold">Who we supply</h2>
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
