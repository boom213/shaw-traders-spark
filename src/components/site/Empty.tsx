import { Link } from "@tanstack/react-router";
import { PackageSearch } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BUSINESS, whatsappLink } from "@/lib/catalog";

export function EmptyCatalogue({ title = "Catalogue coming online", note }: { title?: string; note?: string }) {
  return (
    <div className="rounded-3xl border border-dashed border-border bg-surface px-6 py-14 text-center">
      <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-background text-primary shadow-[var(--shadow-card)]">
        <PackageSearch className="size-6" />
      </span>
      <h3 className="mt-4 font-display text-lg font-bold">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
        {note ?? "Products are being added to this section. Contact us for price and availability — we stock a wide range of EV parts at our Bud Bud counter."}
      </p>
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        <Button asChild>
          <a href={whatsappLink(`Hello ${BUSINESS.name}, please share availability and price for the part I need.`)} target="_blank" rel="noreferrer">
            Ask on WhatsApp
          </a>
        </Button>
        <Button variant="outline" asChild>
          <a href={`tel:${BUSINESS.phone}`}>Call {BUSINESS.phone}</a>
        </Button>
        <Button variant="ghost" asChild>
          <Link to="/admin">Add products in Admin</Link>
        </Button>
      </div>
    </div>
  );
}

export function SectionHeading({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">{title}</h2>
        {subtitle && <p className="mt-1.5 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
