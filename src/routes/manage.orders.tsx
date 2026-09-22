import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { manageOrders, setOrderStatus } from "@/lib/manage-data.functions";
import { ALL_STATUSES, formatINR, statusLabel, type OrderStatus } from "@/lib/catalog";

export const Route = createFileRoute("/manage/orders")({
  component: ManageOrders,
});

function ManageOrders() {
  const [q, setQ] = useState("");
  const [term, setTerm] = useState("");
  const queryClient = useQueryClient();

  const { data: orders, isPending } = useQuery({
    queryKey: ["manage-orders", term],
    queryFn: () => manageOrders({ data: { q: term } }),
  });

  const mutation = useMutation({
    mutationFn: (vars: { id: string; status: OrderStatus }) => setOrderStatus({ data: vars }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["manage-orders"] });
      void queryClient.invalidateQueries({ queryKey: ["manage-stats"] });
      toast.success("Order status updated");
    },
    onError: () => toast.error("Could not update this order"),
  });

  return (
    <div className="space-y-4">
      <form
        className="flex max-w-md gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          setTerm(q.trim());
        }}
      >
        <Input placeholder="Search by order number, customer name or phone" value={q} onChange={(e) => setQ(e.target.value)} />
        <Button type="submit" variant="outline">Search</Button>
      </form>

      {isPending && <div className="space-y-3">{[0, 1, 2].map((i) => <div key={i} className="h-36 animate-pulse rounded-2xl bg-muted" />)}</div>}

      {!isPending && (orders ?? []).length === 0 && (
        <p className="rounded-2xl border border-dashed border-border bg-surface p-8 text-center text-sm text-muted-foreground">
          No orders found. Orders placed on the website appear here.
        </p>
      )}

      {(orders ?? []).map((o) => (
        <div key={o.id} className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-display text-lg font-bold">{o.humanId}</p>
              <p className="text-sm text-muted-foreground">
                {new Date(o.placedAt).toLocaleString("en-IN")} · {o.address['name']} · {o.address['phone']}
              </p>
              <p className="text-sm text-muted-foreground">
                {o.address['line1']}, {o.address['city']}, {o.address['state']} – {o.address['pincode']}
              </p>
            </div>
            <div className="text-right">
              <p className="font-display text-lg font-bold">{formatINR(o.total)}</p>
              <p className="text-xs text-muted-foreground">
                {o.paymentMethod} · {o.paymentStatus} · {o.shippingMethod}
              </p>
              <p className="text-xs text-primary">{statusLabel(o.status)}</p>
            </div>
          </div>

          <ul className="mt-3 space-y-1 text-sm">
            {o.items.map((it, i) => (
              <li key={`${o.id}-${i}`} className="flex justify-between gap-3">
                <span className="line-clamp-1">{it.name} × {it.qty}</span>
                <span className="text-muted-foreground">
                  {it.price === null ? "Price on enquiry" : formatINR(it.price * it.qty)}
                </span>
              </li>
            ))}
          </ul>

          <div className="mt-4 flex flex-wrap gap-2">
            {ALL_STATUSES.map((s) => (
              <button
                key={s.value}
                disabled={mutation.isPending}
                onClick={() => mutation.mutate({ id: o.id, status: s.value })}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium ${
                  o.status === s.value ? "border-primary bg-primary text-primary-foreground" : "border-border hover:border-primary"
                }`}
              >
                {s.label}
              </button>
            ))}
            <Button variant="ghost" size="sm" asChild>
              <Link to="/order/$id" params={{ id: o.id }} search={{ t: o.token }}>Open invoice</Link>
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
