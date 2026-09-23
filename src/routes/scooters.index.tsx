import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { SectionHeading } from "@/components/site/Empty";
import { BUSINESS, canonical, formatINR, whatsappLink } from "@/lib/catalog";
import { listVehicles } from "@/lib/vehicles.functions";
import { SPEC_ROWS, type VehicleModel } from "@/lib/vehicles";

export const Route = createFileRoute("/scooters/")({
  loader: async () => await listVehicles(),
  head: () => ({
    meta: [
      { title: "Electric Scooters On Sale" },
      {
        name: "description",
        content:
          "Electric scooters at Shaw Traders EV with full specifications, itemised on-road price, finance options, test rides and booking with a small token amount.",
      },
      { property: "og:title", content: "Electric Scooters On Sale — Shaw Traders EV" },
      { property: "og:description", content: "Range, top speed, battery, warranty and the full on-road price for every model we sell." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: canonical("/scooters") },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: canonical("/scooters") }],
  }),
  component: ScooterList,
});

function ModelCard({ v, picked, onPick }: { v: VehicleModel; picked: boolean; onPick: () => void }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-card)]">
      <Link to="/scooters/$slug" params={{ slug: v.slug }} className="block">
        <div className="aspect-4/3 w-full overflow-hidden bg-surface">
          {v.images[0] ? (
            <img src={v.images[0]} alt={v.name} width={640} height={480} loading="lazy" className="size-full object-cover" />
          ) : (
            <div className="grid size-full place-items-center text-sm text-muted-foreground">Photo coming soon</div>
          )}
        </div>
      </Link>
      <div className="space-y-2 p-4">
        {v.extraSpecs?.['demo'] === "true" && (
          <span className="inline-flex rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-semibold text-amber-900">Sample data</span>
        )}
        {v.brand && <p className="text-xs uppercase tracking-wide text-muted-foreground">{v.brand}</p>}
        <h3 className="font-display text-lg font-bold leading-tight">
          <Link to="/scooters/$slug" params={{ slug: v.slug }}>{v.name}</Link>
        </h3>
        <p className="text-sm text-muted-foreground">
          {[v.specs.certifiedRange && `${v.specs.certifiedRange} range`, v.specs.topSpeed && `${v.specs.topSpeed} top speed`]
            .filter(Boolean)
            .join(" · ") || "Full specifications on the model page"}
        </p>
        <p className="pt-1">
          <span className="font-display text-xl font-bold">{v.price.onRoad > 0 ? formatINR(v.price.onRoad) : "Price on request"}</span>
          {v.price.onRoad > 0 && <span className="ml-1 text-xs text-muted-foreground">on-road</span>}
        </p>
        <div className="flex items-center gap-2 pt-1">
          <Button asChild size="sm" className="flex-1">
            <Link to="/scooters/$slug" params={{ slug: v.slug }}>View & book</Link>
          </Button>
          <label className="flex cursor-pointer items-center gap-1.5 text-xs text-muted-foreground">
            <Checkbox checked={picked} onCheckedChange={onPick} aria-label={`Compare ${v.name}`} />
            Compare
          </label>
        </div>
      </div>
    </div>
  );
}

function ScooterList() {
  const models = Route.useLoaderData();
  const [picked, setPicked] = useState<string[]>([]);
  const chosen = models.filter((m) => picked.includes(m.slug));

  const toggle = (slug: string) =>
    setPicked((prev) => (prev.includes(slug) ? prev.filter((s) => s !== slug) : prev.length >= 3 ? prev : [...prev, slug]));

  return (
    <div className="container-page py-8">
      <SectionHeading
        as="h1"
        title="Electric Scooters"
        subtitle="Real specifications, the full on-road price with nothing hidden, and a booking you can place with a small token amount."
      />

      {models.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border bg-surface px-6 py-14 text-center">
          <h2 className="font-display text-lg font-bold">Models are being added</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Message us and we will tell you which scooters are on the floor today, with the on-road price.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <Button asChild>
              <a href={whatsappLink(`Hello ${BUSINESS.name}, which electric scooters do you have right now?`)} target="_blank" rel="noreferrer">
                Ask on WhatsApp
              </a>
            </Button>
            <Button variant="outline" asChild>
              <a href={`tel:${BUSINESS.phone}`}>Call {BUSINESS.phone}</a>
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {models.map((v) => (
            <ModelCard key={v.id} v={v} picked={picked.includes(v.slug)} onPick={() => toggle(v.slug)} />
          ))}
        </div>
      )}

      {chosen.length >= 2 && (
        <section className="mt-12" aria-label="Model comparison">
          <SectionHeading title="Side by side" subtitle="Tick up to three models above to compare them." />
          <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-[var(--shadow-card)]">
            <table className="w-full min-w-[520px] text-sm">
              <caption className="sr-only">Comparison of the selected scooter models</caption>
              <thead>
                <tr className="border-b border-border bg-surface text-left">
                  <th scope="col" className="p-3 font-semibold">Detail</th>
                  {chosen.map((v) => (
                    <th key={v.id} scope="col" className="p-3 font-semibold">{v.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-border">
                  <th scope="row" className="p-3 text-left font-medium text-muted-foreground">On-road price</th>
                  {chosen.map((v) => (
                    <td key={v.id} className="p-3 font-semibold">{v.price.onRoad > 0 ? formatINR(v.price.onRoad) : "On request"}</td>
                  ))}
                </tr>
                {SPEC_ROWS.map((row) => (
                  <tr key={row.key} className="border-b border-border last:border-0">
                    <th scope="row" className="p-3 text-left font-medium text-muted-foreground">{row.label}</th>
                    {chosen.map((v) => (
                      <td key={v.id} className="p-3">{(v.specs[row.key] as string | null) || "—"}</td>
                    ))}
                  </tr>
                ))}
                <tr className="border-b border-border last:border-0">
                  <th scope="row" className="p-3 text-left font-medium text-muted-foreground">Warranty</th>
                  {chosen.map((v) => (
                    <td key={v.id} className="p-3">
                      {v.specs.warrantyYears ? `${v.specs.warrantyYears} years` : "—"}
                      {v.specs.warrantyKm ? ` / ${v.specs.warrantyKm.toLocaleString("en-IN")} km` : ""}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
