import { createFileRoute } from "@tanstack/react-router";
import { FindPartsWidget } from "@/components/site/FindPartsWidget";
import { CategoryGrid } from "@/components/site/CategoryGrid";
import { Button } from "@/components/ui/button";
import { BUSINESS, breadcrumbLd, canonical, whatsappLink } from "@/lib/catalog";

export const Route = createFileRoute("/find-parts")({
  head: () => ({
    meta: [
      { title: "Find Parts for Your EV" },
      { name: "description", content: "Tell us your EV brand, model and year and we will match the right battery, charger, motor or body part from our Bud Bud store." },
      { property: "og:title", content: "Find Parts for Your EV — Shaw Traders EV" },
      { property: "og:description", content: "Match EV spare parts to your vehicle brand, model and year." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: canonical("/find-parts") },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: canonical("/find-parts") }],
    scripts: [breadcrumbLd([{ name: "Find Parts for Your EV", path: "/find-parts" }])],
  }),

  component: FindPartsPage,
});

function FindPartsPage() {
  return (
    <div className="container mx-auto space-y-8 px-4 py-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold md:text-3xl">Find Parts for Your EV</h1>
        <p className="text-sm text-muted-foreground">Pick your vehicle to narrow the catalogue, or send us the details and we will confirm the right fit.</p>
      </header>

      <FindPartsWidget />

      <div className="rounded-2xl border border-border bg-surface p-5">
        <h2 className="text-lg font-semibold">Not sure which part fits?</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Send a photo of the old part along with your vehicle brand, model and year. Our team at {BUSINESS.address} will confirm availability and price.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button asChild>
            <a href={whatsappLink("Hi Shaw Traders EV, I need help finding a part for my EV.")} target="_blank" rel="noreferrer">
              Ask on WhatsApp
            </a>
          </Button>
          <Button asChild variant="outline">
            <a href={`tel:${BUSINESS.phone}`}>Call {BUSINESS.phone}</a>
          </Button>
        </div>
      </div>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Browse by category</h2>
        <CategoryGrid />
      </section>
    </div>
  );
}
