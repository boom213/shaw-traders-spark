import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SectionHeading } from "@/components/site/Empty";
import { useStore } from "@/hooks/useStore";
import { findOrder, myOrders } from "@/lib/orders.functions";
import { canonical, formatINR, statusLabel } from "@/lib/catalog";

export const Route = createFileRoute("/track")({
  head: () => ({
    meta: [
      { title: "Track Your Order — Shaw Traders EV" },
      { name: "description", content: "Enter your Shaw Traders EV order number and phone to see the current status of your EV spare parts delivery." },
      { property: "og:title", content: "Track Your Order — Shaw Traders EV" },
      { property: "og:description", content: "Check where your EV parts order has reached." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: canonical("/track") }],
  }),
  component: TrackPage,
});

function TrackPage() {
  const navigate = useNavigate();
  const { user, authReady } = useStore();
  const [id, setId] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);

  const { data: orders } = useQuery({
    queryKey: ["my-orders", user?.id],
    queryFn: () => myOrders(),
    enabled: Boolean(user),
  });

  const track = async () => {
    setBusy(true);
    const res = await findOrder({ data: { humanId: id, phoneLast4: phone } });
    setBusy(false);
    if ("error" in res) {
      toast.error(res.error);
      return;
    }
    void navigate({ to: "/order/$id", params: { id: res.id }, search: { t: res.token } });
  };

  return (
    <div className="container-page py-10">
      <SectionHeading
        title="Track your order"
        subtitle="Enter the order number from your confirmation (e.g. STE-260908-1234) and the last 4 digits of your phone number."
      />
      <form
        className="grid max-w-xl gap-3 sm:grid-cols-[1fr_140px_auto] sm:items-end"
        onSubmit={(e) => {
          e.preventDefault();
          void track();
        }}
      >
        <div className="grid gap-1.5">
          <Label className="text-xs">Order number</Label>
          <Input placeholder="STE-260908-1234" value={id} onChange={(e) => setId(e.target.value.toUpperCase())} />
        </div>
        <div className="grid gap-1.5">
          <Label className="text-xs">Phone last 4</Label>
          <Input inputMode="numeric" maxLength={4} placeholder="1234" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <Button type="submit" disabled={busy}>{busy ? "Checking…" : "Track"}</Button>
      </form>

      {authReady && !user && (
        <p className="mt-4 text-sm text-muted-foreground">
          <Link to="/account" className="font-medium underline">Sign in</Link> to see all your orders in one place.
        </p>
      )}

      {orders && orders.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-3 font-display text-lg font-bold">Your recent orders</h2>
          <div className="grid gap-2">
            {orders.map((o) => (
              <Link
                key={o.id}
                to="/order/$id"
                params={{ id: o.id }}
                search={{ t: o.token }}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-card px-4 py-3 hover:border-primary"
              >
                <span>
                  <span className="block text-sm font-semibold">{o.humanId}</span>
                  <span className="block text-xs text-muted-foreground">
                    {new Date(o.placedAt).toLocaleDateString("en-IN")} · {statusLabel(o.status)}
                  </span>
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
