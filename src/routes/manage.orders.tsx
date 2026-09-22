import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useStore } from "@/hooks/useStore";
import { ORDER_STATUSES, formatINR, type OrderStatus } from "@/lib/catalog";

export const Route = createFileRoute("/manage/orders")({
  component: ManageOrders,
});

function ManageOrders() {
  const { state, update } = useStore();
  const [q, setQ] = useState("");

  const orders = state.orders.filter((o) => {
    const term = q.trim().toLowerCase();
    if (!term) return true;
    return `${o.id} ${o.address['name'] ?? ""} ${o.address['phone'] ?? ""}`.toLowerCase().includes(term);
  });

  const setStatus = (id: string, status: OrderStatus) => {
    update((s) => ({ ...s, orders: s.orders.map((o) => (o.id === id ? { ...o, status } : o)) }));
    toast.success(`Order ${id} marked ${status}`);
  };

  return (
    <div className="space-y-4">
      <Input placeholder="Search by order ID, customer name or phone" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-md" />

      {orders.length === 0 && (
        <p className="rounded-2xl border border-dashed border-border bg-surface p-8 text-center text-sm text-muted-foreground">
          No orders yet. Orders placed on the website appear here.
        </p>
      )}

      {orders.map((o) => (
        <div key={o.id} className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-display text-lg font-bold">{o.id}</p>
              <p className="text-sm text-muted-foreground">
                {new Date(o.createdAt).toLocaleString("en-IN")} · {o.address['name']} · {o.address['phone']}
              </p>
              <p className="text-sm text-muted-foreground">
                {o.address['line1']}, {o.address['city']}, {o.address['state']} – {o.address['pincode']}
              </p>
            </div>
            <div className="text-right">
              <p className="font-display text-lg font-bold">{formatINR(o.total)}</p>
              <p className="text-xs text-muted-foreground">{o.paymentMethod} · {o.shippingMethod}</p>
            </div>
          </div>

          <ul className="mt-3 space-y-1 text-sm">
            {o.items.map((it) => (
              <li key={it.productId} className="flex justify-between gap-3">
                <span className="line-clamp-1">{it.name} × {it.qty}</span>
                <span className="text-muted-foreground">{it.price === undefined ? "Price on enquiry" : formatINR(it.price * it.qty)}</span>
              </li>
            ))}
          </ul>

          <div className="mt-4 flex flex-wrap gap-2">
            {ORDER_STATUSES.map((s) => (
              <button
                key={s}
                onClick={() => setStatus(o.id, s)}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium ${
                  o.status === s ? "border-primary bg-primary text-primary-foreground" : "border-border hover:border-primary"
                }`}
              >
                {s}
              </button>
            ))}
            <Button variant="ghost" size="sm" asChild>
              <Link to="/order/$id" params={{ id: o.id }}>Open invoice</Link>
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
