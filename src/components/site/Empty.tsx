import { Link } from "@tanstack/react-router";
import { PackageSearch } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BUSINESS, whatsappLink } from "@/lib/catalog";

export function EmptyCatalogue({ title = "Nothing to show here yet", note }: { title?: string; note?: string }) {
  return (
    <div className="rounded-3xl border border-dashed border-border bg-surface px-6 py-14 text-center">
      <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-background text-primary shadow-[var(--shadow-card)]">
        <PackageSearch className="size-6" />
      </span>
      <h3 className="mt-4 font-display text-lg font-bold">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
        {note ??
          "Contact us for price and availability — we stock a wide range of EV parts at our Bud Bud counter."}
      </p>
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        <Button asChild>
          <a
            href={whatsappLink(`Hello ${BUSINESS.name}, please share availability and price for the part I need.`)}
            target="_blank"
            rel="noreferrer"
          >
            Ask on WhatsApp
          </a>
        </Button>
        <Button variant="outline" asChild>
          <a href={`tel:${BUSINESS.phone}`}>Call {BUSINESS.phone}</a>
        </Button>
        <Button variant="ghost" asChild>
          <Link to="/shop">Browse the shop</Link>
        </Button>
      </div>
    </div>
  );
}

export function SectionHeading({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
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

/** Placeholder card shown while product data loads, so lists never flash empty. */
export function ProductSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-card)]">
      <div className="aspect-square w-full animate-pulse bg-muted" />
      <div className="space-y-2 p-3.5">
        <div className="h-3 w-1/3 animate-pulse rounded bg-muted" />
        <div className="h-4 w-full animate-pulse rounded bg-muted" />
        <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
        <div className="mt-3 h-8 w-full animate-pulse rounded bg-muted" />
      </div>
    </div>
  );
}

export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <ProductSkeleton key={i} />
      ))}
    </div>
  );
}

export function LineSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="grid gap-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-16 w-full animate-pulse rounded-2xl bg-muted" />
      ))}
    </div>
  );
}
