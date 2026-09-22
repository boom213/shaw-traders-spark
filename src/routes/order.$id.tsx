import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, Circle, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionHeading } from "@/components/site/Empty";
import { useStore } from "@/hooks/useStore";
import { BUSINESS, ORDER_STATUSES, formatINR, whatsappLink } from "@/lib/catalog";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/order/$id")({
  head: () => ({
    meta: [
      { title: "Order Details & Tracking — Shaw Traders EV" },
      { name: "description", content: "See your Shaw Traders EV order confirmation, items, delivery address and live order status from confirmed to delivered." },
      { property: "og:title", content: "Order Details & Tracking — Shaw Traders EV" },
      { property: "og:description", content: "Track your EV parts order with Shaw Traders EV." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: OrderPage,
});

function OrderPage() {
  const { id } = Route.useParams();
  const { state, ready } = useStore();
  const order = state.orders.find((o) => o.id === id);

  if (!ready) return <div className="container-page py-16 text-sm text-muted-foreground">Loading order…</div>;

  if (!order) {
    return (
      <div className="container-page py-16 text-center">
        <SectionHeading title="Order not found" />
        <p className="text-sm text-muted-foreground">We couldn't find order {id} on this device.</p>
        <div className="mt-5 flex justify-center gap-2">
          <Button asChild><Link to="/track">Track another order</Link></Button>
          <Button variant="outline" asChild>
            <a href={whatsappLink(`Hello ${BUSINESS.name}, I need help with order ${id}.`)} target="_blank" rel="noreferrer">Ask on WhatsApp</a>
          </Button>
        </div>
      </div>
    );
  }

  const stepIndex = ORDER_STATUSES.indexOf(order.status);

  return (
    <div className="container-page py-10">
      <div className="rounded-3xl border border-primary/30 bg-accent px-6 py-8 text-center">
        <CheckCircle2 className="mx-auto size-10 text-primary" />
        <h1 className="mt-3 font-display text-2xl font-bold">Thank you, your order is confirmed</h1>
        <p className="mt-1 text-sm text-muted-foreground">Order ID <strong className="text-foreground">{order.id}</strong> · placed {new Date(order.createdAt).toLocaleString("en-IN")}</p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <Button asChild>
            <a href={whatsappLink(`Hello ${BUSINESS.name}, this is about order ${order.id}.`)} target="_blank" rel="noreferrer">Confirm on WhatsApp</a>
          </Button>
          <Button variant="outline" asChild><Link to="/shop">Continue shopping</Link></Button>
        </div>
      </div>

      <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_340px]">
        <div>
          <SectionHeading title="Order tracking" subtitle={`Current status: ${order.status}`} />
          <ol className="grid gap-0">
            {ORDER_STATUSES.map((s, i) => (
              <li key={s} className="flex gap-3">
                <div className="flex flex-col items-center">
                  {i <= stepIndex ? <CheckCircle2 className="size-5 text-primary" /> : <Circle className="size-5 text-muted-foreground/50" />}
                  {i < ORDER_STATUSES.length - 1 && <span className={cn("w-px flex-1", i < stepIndex ? "bg-primary" : "bg-border")} />}
                </div>
                <div className="pb-6">
                  <p className={cn("text-sm font-semibold", i <= stepIndex ? "text-foreground" : "text-muted-foreground")}>{s}</p>
                  {i === stepIndex && <p className="text-xs text-muted-foreground">Updated {new Date(order.createdAt).toLocaleDateString("en-IN")}</p>}
                </div>
              </li>
            ))}
          </ol>

          <h3 className="mt-4 font-display text-base font-bold">Items</h3>
          <div className="mt-3 grid gap-2">
            {order.items.map((i) => (
              <div key={i.productId} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
                <div className="size-14 shrink-0 overflow-hidden rounded-lg bg-surface">
                  {i.image ? <img src={i.image} alt={i.name} loading="lazy" className="size-full object-cover" /> : <span className="grid size-full place-items-center text-muted-foreground"><ImageIcon className="size-4" /></span>}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold">{i.name}</p>
                  <p className="text-xs text-muted-foreground">Qty {i.qty}</p>
                </div>
                <p className="text-sm font-semibold">{i.price !== undefined ? formatINR(i.price * i.qty) : "On request"}</p>
              </div>
            ))}
          </div>
        </div>

        <aside className="h-fit grid gap-4">
          <div className="rounded-2xl border border-border bg-card p-5">
            <h3 className="font-display text-base font-bold">Delivery address</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {order.address.name}<br />
              {order.address.line1}{order.address.landmark ? `, ${order.address.landmark}` : ""}<br />
              {order.address.city}, {order.address.state} – {order.address.pincode}<br />
              Phone: {order.address.phone}
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-5 text-sm">
            <h3 className="font-display text-base font-bold">Payment & delivery</h3>
            <p className="mt-2 text-muted-foreground">{order.paymentMethod}</p>
            <p className="text-muted-foreground">{order.shippingMethod}</p>
            <p className="mt-3 font-display text-lg font-bold">Total {formatINR(order.total)}</p>
          </div>
        </aside>
      </div>
    </div>
  );
}
