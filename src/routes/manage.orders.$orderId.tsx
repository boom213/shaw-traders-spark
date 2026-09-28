import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { OrderDetailActions } from "@/components/manage/OrderActions";
import { SparkRing } from "@/components/site/SparkLoaders";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatINR, statusLabel } from "@/lib/catalog";
import { manageOrder } from "@/lib/manage-data.functions";

export const Route = createFileRoute("/manage/orders/$orderId")({
  head: () => ({ meta: [{ title: "Order details — Shaw Traders EV Manager" }, { name: "description", content: "Review and fulfil an online Shaw Traders EV order." }, { name: "robots", content: "noindex" }, { property: "og:title", content: "Order details — Shaw Traders EV Manager" }, { property: "og:description", content: "Review and fulfil an online retail order." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: OrderDetailPage,
});

function OrderDetailPage() {
  const { orderId } = Route.useParams();
  const query = useQuery({ queryKey: ["manage-order", orderId], queryFn: () => manageOrder({ data: { orderId } }) });
  const order = query.data;
  if (query.isPending) return <div className="grid min-h-72 place-items-center rounded-lg border border-border bg-card"><div className="flex items-center gap-3 text-sm text-muted-foreground"><SparkRing /> Loading order details…</div></div>;
  if (!order) return <div className="space-y-4"><p className="text-sm text-muted-foreground">Online order not found.</p><Button variant="outline" asChild><Link to="/manage/orders"><ArrowLeft className="size-4" /> Orders</Link></Button></div>;
  const address = order.address;
  return <div className="space-y-6">
    <Button variant="ghost" size="sm" asChild><Link to="/manage/orders"><ArrowLeft className="size-4" /> Orders</Link></Button>
    <header className="rounded-lg border border-border bg-card p-5 shadow-[var(--shadow-card)]"><div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4"><div className="min-w-0"><div className="flex min-w-0 flex-wrap items-center gap-3"><Badge className="shrink-0">{statusLabel(order.status)}</Badge><h2 className="truncate font-display text-xl font-bold sm:text-2xl">{order.humanId}</h2>{order.needsPaymentReview && <Badge variant="destructive">Needs review</Badge>}</div><p className="mt-2 text-sm text-muted-foreground">{new Date(order.placedAt).toLocaleString("en-IN")} · {address['name'] || "Customer"} · {address['phone']}</p><p className="mt-1 truncate text-sm text-muted-foreground">{[address['line1'], address['landmark'], address['city'], address['state'], address['pincode']].filter(Boolean).join(", ")}</p></div><div className="shrink-0 text-right"><p className="font-display text-2xl font-bold">{formatINR(order.total)}</p><p className="text-xs capitalize text-muted-foreground">{order.paymentMethod || "Payment unavailable"} · {order.paymentStatus.replaceAll("_", " ")}</p></div></div></header>
    <OrderDetailActions order={order} />
    <div className="grid gap-4 lg:grid-cols-2"><section className="rounded-lg border border-border bg-card p-5"><h3 className="font-display text-lg font-bold">Order Information</h3><div className="mt-4 divide-y">{order.items.map((item, index) => <div key={`${item.name}-${index}`} className="flex justify-between gap-4 py-3"><div><p className="font-medium">{item.name}</p><p className="text-xs text-muted-foreground">Qty {item.qty}{item.rackLocation ? ` · Shelf ${item.rackLocation}` : ""}</p></div><p className="font-semibold">{item.price === null ? "Price on enquiry" : formatINR(item.price * item.qty)}</p></div>)}</div></section><section className="rounded-lg border border-border bg-card p-5"><h3 className="font-display text-lg font-bold">Order Summary</h3><div className="mt-4 space-y-3 text-sm"><Summary label="Items total" value={order.subtotal} /><Summary label="Discount" value={-order.discount} /><Summary label="Shipping" value={order.shippingFee} /><Summary label="Tax" value={order.taxAmount} /><div className="border-t border-border pt-3"><Summary label="Total" value={order.total} strong /></div>{order.refunded > 0 && <Summary label="Refunded" value={-order.refunded} />}</div></section></div>
  </div>;
}

function Summary({ label, value, strong = false }: { label: string; value: number; strong?: boolean }) { return <div className={`flex justify-between gap-3 ${strong ? "text-base font-bold" : ""}`}><span>{label}</span><span>{formatINR(value)}</span></div>; }