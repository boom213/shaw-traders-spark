import { createFileRoute, Link } from "@tanstack/react-router";
import { useStore } from "@/hooks/useStore";
import { CATEGORIES, formatINR } from "@/lib/catalog";

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
  const { state } = useStore();
  const products = state.products;
  const noPrice = products.filter((p) => p.price === undefined).length;
  const noStock = products.filter((p) => p.stock === undefined).length;
  const noPhoto = products.filter((p) => !p.images[0]).length;
  const lowStock = products.filter((p) => p.stock !== undefined && p.stock > 0 && p.stock <= 3).length;
  const outOfStock = products.filter((p) => p.stock === 0).length;
  const revenue = state.orders.reduce((n, o) => n + o.total, 0);
  const customers = new Set(state.orders.map((o) => o.address['phone'])).size;

  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Products" value={String(products.length)} note={`${CATEGORIES.length} categories`} />
        <Stat label="Orders" value={String(state.orders.length)} note={`${formatINR(revenue)} value`} />
        <Stat label="Customers" value={String(customers)} note="From placed orders" />
        <Stat label="Low stock" value={String(lowStock)} note={`${outOfStock} out of stock`} />
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-card)]">
        <h2 className="font-display text-lg font-bold">What still needs your input</h2>
        <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
          <li>{noPrice} products have no price — customers see “Contact us for price and availability.”</li>
          <li>{noStock} products have no stock quantity set.</li>
          <li>{noPhoto} products show a general category photo instead of their own photo.</li>
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
