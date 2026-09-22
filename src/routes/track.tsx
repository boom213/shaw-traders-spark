import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SectionHeading } from "@/components/site/Empty";
import { useStore } from "@/hooks/useStore";
import { formatINR } from "@/lib/catalog";

export const Route = createFileRoute("/track")({
  head: () => ({
    meta: [
      { title: "Track Your Order — Shaw Traders EV" },
      { name: "description", content: "Enter your Shaw Traders EV order ID to see the current status of your EV spare parts delivery." },
      { property: "og:title", content: "Track Your Order — Shaw Traders EV" },
      { property: "og:description", content: "Check where your EV parts order has reached." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TrackPage,
});

function TrackPage() {
  const navigate = useNavigate();
  const { state } = useStore();
  const [id, setId] = useState("");

  return (
    <div className="container-page py-10">
      <SectionHeading title="Track your order" subtitle="Enter the order ID from your confirmation, e.g. STE-260908-1234." />
      <div className="flex max-w-md gap-2">
        <Input placeholder="Order ID" value={id} onChange={(e) => setId(e.target.value.toUpperCase())} />
        <Button
          onClick={() => {
            const found = state.orders.find((o) => o.id === id.trim());
            if (!found) return toast.error("No order found with that ID on this device");
            navigate({ to: "/order/$id", params: { id: found.id } });
          }}
        >
          Track
        </Button>
      </div>

      {state.orders.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-3 font-display text-lg font-bold">Your recent orders</h2>
          <div className="grid gap-2">
            {state.orders.map((o) => (
              <Link
                key={o.id}
                to="/order/$id"
                params={{ id: o.id }}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-card px-4 py-3 hover:border-primary"
              >
                <span>
                  <span className="block text-sm font-semibold">{o.id}</span>
                  <span className="block text-xs text-muted-foreground">{new Date(o.createdAt).toLocaleDateString("en-IN")} · {o.status}</span>
                </span>
                <span className="text-sm font-semibold">{formatINR(o.total)}</span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
