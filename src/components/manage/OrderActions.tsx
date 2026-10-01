import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Check, MapPin, MessageCircle, Printer } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SparkRing } from "@/components/site/SparkLoaders";
import { customerWhatsApp, deliveryMapUrl, downloadPdf, printPackingSlip } from "@/components/manage/order-tools";
import { ALL_STATUSES, formatINR, ORDER_FLOW, statusLabel, type OrderStatus } from "@/lib/catalog";
import { COURIERS, courierByName, trackingUrlFor } from "@/lib/couriers";
import { decideOrderRequest, recordRefund, resolvePaymentReview, setOrderStatus, setTracking, staffInvoice, staffPickingInvoice, type ManageOrder } from "@/lib/manage-data.functions";

function nextStatus(current: OrderStatus): OrderStatus | null {
  const index = ORDER_FLOW.findIndex((status) => status.value === current);
  return index < 0 || index + 1 >= ORDER_FLOW.length ? null : ORDER_FLOW[index + 1]?.value ?? null;
}

export function InvoiceButton({ orderId, staffCopy = false }: { orderId: string; staffCopy?: boolean }) {
  const customerInvoice = useServerFn(staffInvoice);
  const pickingInvoice = useServerFn(staffPickingInvoice);
  const [busy, setBusy] = useState(false);
  return <Button variant="outline" size="sm" disabled={busy} onClick={async () => {
    setBusy(true);
    const result = await (staffCopy ? pickingInvoice : customerInvoice)({ data: { orderId } });
    setBusy(false);
    if ("error" in result) return toast.error(result.error);
    downloadPdf(result.base64, result.fileName);
  }}>{busy ? "Preparing…" : staffCopy ? "Staff Invoice" : "Download invoice"}</Button>;
}

export function OrderDetailActions({ order }: { order: ManageOrder }) {
  const queryClient = useQueryClient();
  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["manage-order", order.id] });
    void queryClient.invalidateQueries({ queryKey: ["manage-orders"] });
    void queryClient.invalidateQueries({ queryKey: ["manage-order-counts"] });
  };
  const mutation = useMutation({
    mutationFn: (variables: { id: string; status: OrderStatus }) => setOrderStatus({ data: variables }),
    onSuccess: () => { refresh(); toast.success("Order status updated and the customer has been told"); },
    onError: () => toast.error("Could not update this order"),
  });
  const next = nextStatus(order.status);
  const mapUrl = deliveryMapUrl(order.address);
  return <div className="space-y-4">
    <Requests order={order} onDone={refresh} />
    {order.needsPaymentReview && <PaymentReview order={order} onDone={refresh} />}
    <div className="flex flex-wrap gap-2">
      {next && <Button size="sm" disabled={mutation.isPending} onClick={() => mutation.mutate({ id: order.id, status: next })}><Check className="size-4" /> Mark {statusLabel(next).toLowerCase()}</Button>}
      <Button size="sm" variant="outline" onClick={() => { if (!printPackingSlip(order)) toast.error("Allow pop-ups to print the packing slip"); }}><Printer className="size-4" /> Packing slip</Button>
      <Button size="sm" variant="outline" asChild><a href={customerWhatsApp(order)} target="_blank" rel="noreferrer"><MessageCircle className="size-4" /> WhatsApp customer</a></Button>
      <InvoiceButton orderId={order.id} />
      <InvoiceButton orderId={order.id} staffCopy />
      {mapUrl && <Button size="sm" variant="outline" asChild><a href={mapUrl} target="_blank" rel="noreferrer"><MapPin className="size-4" /> View delivery pin</a></Button>}
      <Button variant="ghost" size="sm" asChild><Link to="/order/$id" params={{ id: order.id }} search={{ t: order.token }}>Open order page</Link></Button>
    </div>
    <div className="flex flex-wrap gap-2 border-t border-border pt-4">
      {ALL_STATUSES.map((status) => <Button key={status.value} size="sm" variant={order.status === status.value ? "default" : "outline"} disabled={mutation.isPending} onClick={() => mutation.mutate({ id: order.id, status: status.value })}>{status.label}</Button>)}
    </div>
    <div className="grid gap-4 border-t border-border pt-4 md:grid-cols-2"><TrackingForm order={order} onDone={refresh} /><RefundForm order={order} onDone={refresh} /></div>
  </div>;
}

function PaymentReview({ order, onDone }: { order: ManageOrder; onDone: () => void }) {
  const resolve = useServerFn(resolvePaymentReview);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  return <div className="rounded-lg border border-destructive bg-surface p-4"><p className="font-semibold text-destructive">Payment needs review</p><p className="mt-1 text-sm text-muted-foreground">{order.paymentReviewNote ?? "Payment arrived after this order was cancelled or its stock was released."}</p><div className="mt-3 flex flex-wrap gap-2"><Input className="min-w-56 flex-1" placeholder="How was this resolved?" value={note} onChange={(event) => setNote(event.target.value)} /><Button variant="destructive" disabled={busy || note.trim().length < 3} onClick={async () => { setBusy(true); const result = await resolve({ data: { orderId: order.id, note } }); setBusy(false); if (!result.ok) return toast.error(result.error ?? "Could not resolve this review"); toast.success("Payment review resolved"); onDone(); }}>{busy && <SparkRing />}{busy ? "Saving…" : "Resolve review"}</Button></div></div>;
}

function Requests({ order, onDone }: { order: ManageOrder; onDone: () => void }) {
  const decide = useServerFn(decideOrderRequest);
  const [note, setNote] = useState("");
  if (!order.requests.length) return null;
  return <div className="grid gap-2">{order.requests.map((request) => request.status === "pending" ? <div key={request.id} className="rounded-lg border border-primary/40 bg-accent p-4"><p className="text-sm font-semibold">{request.kind === "return" ? "Return requested" : "Cancellation requested"} — {request.reason}</p>{request.details && <p className="mt-1 text-sm text-muted-foreground">{request.details}</p>}<div className="mt-3 flex flex-wrap gap-2"><Input className="max-w-xs" placeholder="Note for the customer (optional)" value={note} onChange={(event) => setNote(event.target.value)} /><Button size="sm" onClick={async () => { const result = await decide({ data: { requestId: request.id, approve: true, note } }); result.ok ? toast.success("Approved and the customer has been told") : toast.error(result.error ?? "Could not do that"); onDone(); }}>Approve</Button><Button size="sm" variant="outline" onClick={async () => { const result = await decide({ data: { requestId: request.id, approve: false, note } }); result.ok ? toast.success("Declined and the customer has been told") : toast.error(result.error ?? "Could not do that"); onDone(); }}>Decline</Button></div></div> : <p key={request.id} className="text-xs text-muted-foreground">{request.kind === "return" ? "Return" : "Cancellation"} request ({request.reason}) — {request.status}</p>)}</div>;
}

function TrackingForm({ order, onDone }: { order: ManageOrder; onDone: () => void }) {
  const save = useServerFn(setTracking);
  const existingCourier = courierByName(order.courierName ?? "");
  const [selectedCourierId, setSelectedCourierId] = useState(existingCourier?.id ?? (order.courierName ? "other" : ""));
  const [customCourier, setCustomCourier] = useState(existingCourier ? "" : order.courierName ?? "");
  const [number, setNumber] = useState(order.trackingNumber ?? "");
  const [url, setUrl] = useState(order.trackingUrl ?? "");
  const [urlEdited, setUrlEdited] = useState(Boolean(order.trackingUrl));
  const [busy, setBusy] = useState(false);
  const selectedCourier = COURIERS.find((courier) => courier.id === selectedCourierId);
  const courierName = selectedCourierId === "other" ? customCourier : selectedCourier?.name ?? "";
  const generatedUrl = trackingUrlFor(courierName, number);

  const updateAutomaticUrl = (nextCourierName: string, nextNumber: string) => {
    if (!urlEdited) setUrl(trackingUrlFor(nextCourierName, nextNumber) ?? "");
  };

  return <section className="grid min-w-0 gap-2 rounded-lg border border-border bg-surface p-4">
    <p className="font-semibold">Courier &amp; tracking</p>
    <Select value={selectedCourierId} onValueChange={(value) => {
      setSelectedCourierId(value);
      const nextCourier = COURIERS.find((courier) => courier.id === value)?.name ?? customCourier;
      updateAutomaticUrl(nextCourier, number);
    }}>
      <SelectTrigger aria-label="Courier"><SelectValue placeholder="Choose courier" /></SelectTrigger>
      <SelectContent>
        {COURIERS.map((courier) => <SelectItem key={courier.id} value={courier.id}>{courier.name}</SelectItem>)}
        <SelectItem value="other">Other</SelectItem>
      </SelectContent>
    </Select>
    {selectedCourierId === "other" && <Input placeholder="Courier name" value={customCourier} onChange={(event) => { setCustomCourier(event.target.value); updateAutomaticUrl(event.target.value, number); }} />}
    <Input placeholder="Tracking number" value={number} onChange={(event) => { setNumber(event.target.value); updateAutomaticUrl(courierName, event.target.value); }} />
    {generatedUrl && <p className="min-w-0 break-all text-xs text-muted-foreground">Customer tracking link: {generatedUrl}</p>}
    <Input placeholder="Tracking link (optional)" value={url} onChange={(event) => { setUrl(event.target.value); setUrlEdited(true); }} />
    <Button size="sm" className="w-fit" disabled={busy} onClick={async () => { setBusy(true); const result = await save({ data: { id: order.id, courier: courierName, trackingNumber: number, trackingUrl: url, markShipped: true } }); setBusy(false); if (!result.ok) return toast.error(result.error ?? "Could not save"); toast.success("Tracking saved, order marked shipped and the customer told"); onDone(); }}>{busy && <SparkRing />}{busy ? "Saving…" : "Save & mark shipped"}</Button>
  </section>;
}

function RefundForm({ order, onDone }: { order: ManageOrder; onDone: () => void }) {
  const refund = useServerFn(recordRefund);
  const left = Math.max(0, order.total - order.refunded);
  const [amount, setAmount] = useState(String(left));
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  return <section className="grid gap-2 rounded-lg border border-border bg-surface p-4"><p className="font-semibold">Refund</p><p className="text-xs text-muted-foreground">{order.paymentStatus === "paid" ? "Paid online — the refund goes back to the customer's card or UPI automatically." : "Not paid online — this records the refund you handed back yourself."} Left to refund: {formatINR(left)}</p><Input type="number" value={amount} onChange={(event) => setAmount(event.target.value)} /><Input placeholder="Reason / note (optional)" value={note} onChange={(event) => setNote(event.target.value)} /><Button size="sm" variant="outline" className="w-fit" disabled={busy || left <= 0} onClick={async () => { setBusy(true); const result = await refund({ data: { orderId: order.id, amount: Number(amount), note } }); setBusy(false); if (!result.ok) return toast.error(result.error ?? "Could not record the refund"); toast.success("Refund recorded and the customer told"); onDone(); }}>{busy && <SparkRing />}{busy ? "Working…" : "Record refund"}</Button></section>;
}