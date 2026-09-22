import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { manageStats } from "@/lib/manage-data.functions";
import { formatINR } from "@/lib/catalog";

export const Route = createFileRoute("/manage/")({
  component: ManageOverview,
});

function Stat({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-2 font-display text-2xl font-bold">{value}</p>
      {note && <p className="mt-1 text-xs text-muted-foreground">{note}</p>}
    </div>
  );
}

function ManageOverview() {
  const { data, isPending } = useQuery({ queryKey: ["manage-stats"], queryFn: () => manageStats() });

  if (isPending || !data) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-28 animate-pulse rounded-2xl bg-muted" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Products" value={String(data.products)} note={`${data.categories} categories`} />
        <Stat label="Orders" value={String(data.orders)} note={`${formatINR(data.revenue)} value`} />
        <Stat label="Customers" value={String(data.customers)} note="From placed orders" />
        <Stat label="Low stock" value={String(data.lowStock)} note={`${data.outOfStock} out of stock`} />
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-card)]">
        <h2 className="font-display text-lg font-bold">What still needs your input</h2>
        <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
          <li>{data.noPrice} products have no price — customers see “Contact us for price and availability.”</li>
          <li>{data.outOfStock} products are showing as out of stock.</li>
          <li>{data.noPhoto} products show a general category photo instead of their own photo.</li>
        </ul>
        <Link
          to="/manage/catalogue"
          className="mt-4 inline-flex rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground"
        >
          Fill stock & photos
        </Link>
      </div>
    </div>
  );
}
