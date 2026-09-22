import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Circle, ImageIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SectionHeading } from "@/components/site/Empty";
import { getOrder } from "@/lib/orders.functions";
import { BUSINESS, ORDER_FLOW, formatINR, statusLabel, whatsappLink } from "@/lib/catalog";
import { cn } from "@/lib/utils";

type OrderSearch = { t?: string };

export const Route = createFileRoute("/order/$id")({
  validateSearch: (search: Record<string, unknown>): OrderSearch => ({
    t: typeof search['t'] === "string" ? search['t'] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Order Details & Tracking — Shaw Traders EV" },
      { name: "description", content: "See your Shaw Traders EV order confirmation, items, delivery address and live order status from confirmed to delivered." },
      { property: "og:title", content: "Order Details & Tracking — Shaw Traders EV" },
      { property: "og:description", content: "Track your EV parts order with Shaw Traders EV." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: OrderPage,
});

function OrderPage() {
  const { id } = Route.useParams();
  const { t } = Route.useSearch();
  const [last4, setLast4] = useState("");
  const [proof, setProof] = useState("");

  const { data, isPending } = useQuery({
    queryKey: ["order", t, proof],
    queryFn: () => getOrder({ data: { token: t ?? "", ...(proof ? { phoneLast4: proof } : {}) } }),
    enabled: Boolean(t),
  });

  if (!t) {
    return <NotFound id={id} />;
  }

  if (isPending) return <div className="container-page py-16 text-sm text-muted-foreground">Loading order…</div>;

  if (!data || data.state === "notfound") return <NotFound id={id} />;

  if (data.state === "verify") {
    return (
      <div className="container-page py-16">
        <div className="mx-auto max-w-md rounded-3xl border border-border bg-card p-6 text-center shadow-[var(--shadow-card)]">
          <h1 className="font-display text-xl font-bold">Confirm it's your order</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Enter the last 4 digits of the phone number on this order ({data.phoneHint}).
          </p>
          <form
            className="mt-5 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              setProof(last4.replace(/\D/g, "").slice(-4));
            }}
          >
            <Input inputMode="numeric" maxLength={4} placeholder="1234" value={last4} onChange={(e) => setLast4(e.target.value)} />
            <Button type="submit">View order</Button>
          </form>
          {proof && <p className="mt-3 text-xs text-destructive">Those digits don't match this order.</p>}
          <p className="mt-4 text-xs text-muted-foreground">
            Signed in with the account that placed the order? Your orders appear in <Link to="/account" className="underline">My Account</Link>.
          </p>
        </div>
      </div>
    );
  }

  const order = data.order;
  const stepIndex = ORDER_FLOW.findIndex((s) => s.value === order.status);
  const lastEventAt = order.events?.at(-1)?.createdAt ?? order.updatedAt;

  return (
    <div className="container-page py-10">
      <div className="rounded-3xl border border-primary/30 bg-accent px-6 py-8 text-center">
        <CheckCircle2 className="mx-auto size-10 text-primary" />
        <h1 className="mt-3 font-display text-2xl font-bold">Thank you, your order is confirmed</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Order ID <strong className="text-foreground">{order.humanId}</strong> · placed{" "}
          {new Date(order.placedAt).toLocaleString("en-IN")}
        </p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <Button asChild>
            <a href={whatsappLink(`Hello ${BUSINESS.name}, this is about order ${order.humanId}.`)} target="_blank" rel="noreferrer">Confirm on WhatsApp</a>
          </Button>
          <Button variant="outline" asChild><Link to="/shop">Continue shopping</Link></Button>
        </div>
      </div>

      <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_340px]">
        <div>
          <SectionHeading title="Order tracking" subtitle={`Current status: ${statusLabel(order.status)}`} />
          {order.status === "cancelled" || order.status === "returned" ? (
            <p className="rounded-2xl border border-border bg-surface p-4 text-sm">
              This order is marked <strong>{statusLabel(order.status)}</strong>. Contact us on WhatsApp if you need help.
            </p>
          ) : (
            <ol className="grid gap-0">
              {ORDER_FLOW.map((s, i) => (
                <li key={s.value} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    {i <= stepIndex ? <CheckCircle2 className="size-5 text-primary" /> : <Circle className="size-5 text-muted-foreground/50" />}
                    {i < ORDER_FLOW.length - 1 && <span className={cn("w-px flex-1", i < stepIndex ? "bg-primary" : "bg-border")} />}
                  </div>
                  <div className="pb-6">
                    <p className={cn("text-sm font-semibold", i <= stepIndex ? "text-foreground" : "text-muted-foreground")}>{s.label}</p>
                    {i === stepIndex && (
                      <p className="text-xs text-muted-foreground">Updated {new Date(lastEventAt).toLocaleDateString("en-IN")}</p>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          )}

          <h3 className="mt-4 font-display text-base font-bold">Items</h3>
          <div className="mt-3 grid gap-2">
            {order.items.map((i) => (
              <div key={i.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
                <div className="size-14 shrink-0 overflow-hidden rounded-lg bg-surface">
                  {i.image ? <img src={i.image} alt={i.name} loading="lazy" className="size-full object-cover" /> : <span className="grid size-full place-items-center text-muted-foreground"><ImageIcon className="size-4" /></span>}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold">{i.name}</p>
                  <p className="text-xs text-muted-foreground">Qty {i.qty}</p>
                </div>
                <p className="text-sm font-semibold">{i.price !== null ? formatINR(i.price * i.qty) : "On request"}</p>
              </div>
            ))}
          </div>
        </div>

        <aside className="grid h-fit gap-4">
          <div className="rounded-2xl border border-border bg-card p-5">
            <h3 className="font-display text-base font-bold">Delivery address</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {order.address['name']}<br />
              {order.address['line1']}{order.address['landmark'] ? `, ${order.address['landmark']}` : ""}<br />
              {order.address['city']}, {order.address['state']} – {order.address['pincode']}<br />
              Phone: {order.address['phone']}
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-5 text-sm">
            <h3 className="font-display text-base font-bold">Payment & delivery</h3>
            <p className="mt-2 text-muted-foreground">{order.paymentMethod}</p>
            <p className="text-muted-foreground">{order.shippingMethod}</p>
            <dl className="mt-3 grid gap-1.5 border-t border-border pt-3">
              <div className="flex justify-between"><dt className="text-muted-foreground">Subtotal</dt><dd>{formatINR(order.subtotal)}</dd></div>
              {order.discount > 0 && (
                <div className="flex justify-between"><dt className="text-muted-foreground">Discount</dt><dd className="text-primary">−{formatINR(order.discount)}</dd></div>
              )}
              <div className="flex justify-between"><dt className="text-muted-foreground">Delivery</dt><dd>{order.shippingFee === 0 ? "Free" : formatINR(order.shippingFee)}</dd></div>
              {order.taxAmount > 0 && (
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">GST {order.gstRate}% {order.gstIncluded ? "(included)" : ""}</dt>
                  <dd>{formatINR(order.taxAmount)}</dd>
                </div>
              )}
            </dl>
            <p className="mt-3 font-display text-lg font-bold">Total {formatINR(order.total)}</p>
            {order.gstin && <p className="mt-1 text-xs text-muted-foreground">GSTIN {order.gstin}</p>}
          </div>
        </aside>
      </div>
    </div>
  );
}

function NotFound({ id }: { id: string }) {
  return (
    <div className="container-page py-16 text-center">
      <SectionHeading title="Order not found" />
      <p className="text-sm text-muted-foreground">
        This order link is not valid. Use the tracking page with your order number instead.
      </p>
      <div className="mt-5 flex justify-center gap-2">
        <Button asChild><Link to="/track">Track your order</Link></Button>
        <Button variant="outline" asChild>
          <a href={whatsappLink(`Hello ${BUSINESS.name}, I need help with order ${id}.`)} target="_blank" rel="noreferrer">Ask on WhatsApp</a>
        </Button>
      </div>
    </div>
  );
}
