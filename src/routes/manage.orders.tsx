import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Check, MapPin, MessageCircle, Printer } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  decideOrderRequest,
  manageOrders,
  recordRefund,
  setOrderStatus,
  setTracking,
  staffInvoice,
  type ManageOrder,
} from "@/lib/manage-data.functions";
import { ALL_STATUSES, BUSINESS, formatINR, ORDER_FLOW, statusLabel, type OrderStatus } from "@/lib/catalog";

/** The next step in the normal order journey, so the owner can advance with one tap. */
function nextStatus(current: OrderStatus): OrderStatus | null {
  const i = ORDER_FLOW.findIndex((s) => s.value === current);
  if (i === -1 || i + 1 >= ORDER_FLOW.length) return null;
  return ORDER_FLOW[i + 1]!.value;
}

/** Opens WhatsApp with the customer's number and the order already mentioned. */
function customerWhatsApp(o: ManageOrder) {
  const digits = String(o.address['phone'] ?? "").replace(/\D/g, "").slice(-10);
  const text = `Hello ${String(o.address['name'] ?? "")}, this is ${BUSINESS.name} about your order ${o.humanId}.`;
  return `https://wa.me/91${digits}?text=${encodeURIComponent(text)}`;
}

function deliveryMapUrl(address: Record<string, string>) {
  const latitude = Number(address['latitude']);
  const longitude = Number(address['longitude']);
  return Number.isFinite(latitude) && Number.isFinite(longitude)
    ? `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`
    : null;
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] ?? c);
}

/** Opens a clean one-page slip the owner can print or save for the parcel. */
function printPackingSlip(o: ManageOrder) {
  const a = o.address as Record<string, unknown>;
  const rows = o.items
    .map(
      (it) =>
        `<tr><td>${
          it.image
            ? `<img src="${escapeHtml(it.image)}" width="56" height="56" alt="" style="width:56px;height:56px;object-fit:cover;border-radius:6px;float:left;margin-right:8px"/>`
            : ""
        }${escapeHtml(it.name)}${
          it.rackLocation ? `<br/><span class="muted">Shelf: ${escapeHtml(it.rackLocation)}</span>` : ""
        }</td><td style="text-align:center">${it.qty}</td><td style="text-align:right">${
          it.price === null ? "-" : formatINR(it.price * it.qty)
        }</td></tr>`,
    )
    .join("");

  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${o.humanId}</title><style>
    body{font-family:system-ui,sans-serif;margin:24px;color:#111}
    h1{font-size:20px;margin:0}
    table{width:100%;border-collapse:collapse;margin-top:16px;font-size:14px}
    th,td{border-bottom:1px solid #ddd;padding:8px 6px;text-align:left}
    .muted{color:#555;font-size:13px}
    .box{border:1px solid #ddd;border-radius:8px;padding:12px;margin-top:16px}
    @media print{button{display:none}}
  </style></head><body>
    <h1>${escapeHtml(BUSINESS.name)}</h1>
    <p class="muted">${escapeHtml(BUSINESS.address)}<br/>${escapeHtml(BUSINESS.phone)}</p>
    <h2 style="font-size:16px">Packing slip · ${escapeHtml(o.humanId)}</h2>
    <p class="muted">${new Date(o.placedAt).toLocaleString("en-IN")} · ${escapeHtml(o.paymentMethod ?? "")} · ${escapeHtml(o.paymentStatus)}</p>
    <div class="box">
      <strong>Deliver to</strong><br/>
      ${escapeHtml(String(a['name'] ?? ""))}<br/>
      ${escapeHtml(String(a['line1'] ?? ""))}${a['landmark'] ? `, ${escapeHtml(String(a['landmark']))}` : ""}<br/>
      ${escapeHtml(String(a['city'] ?? ""))}, ${escapeHtml(String(a['state'] ?? ""))} – ${escapeHtml(String(a['pincode'] ?? ""))}<br/>
      ${escapeHtml(String(a['phone'] ?? ""))}
    </div>
    <table><thead><tr><th>Item</th><th style="text-align:center">Qty</th><th style="text-align:right">Amount</th></tr></thead>
    <tbody>${rows}</tbody></table>
    <p style="text-align:right;font-weight:700;margin-top:12px">Total ${formatINR(o.total)}</p>
    <p class="muted">${escapeHtml(o.shippingMethod ?? "")}</p>
    <button onclick="window.print()">Print</button>
  </body></html>`;

  const w = window.open("", "_blank", "width=800,height=900");
  if (!w) return toast.error("Allow pop-ups to print the packing slip");
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 300);
}

export const Route = createFileRoute("/manage/orders")({
  head: () => ({
    meta: [
      { title: "Manage Orders — Shaw Traders EV" },
      { name: "description", content: "Review and fulfil Shaw Traders EV customer orders." },
      { property: "og:title", content: "Manage Orders — Shaw Traders EV" },
      { property: "og:description", content: "Review and fulfil Shaw Traders EV customer orders." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ManageOrders,
});

function downloadPdf(base64: string, fileName: string) {
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  const url = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}

function ManageOrders() {
  const [q, setQ] = useState("");
  const [term, setTerm] = useState("");
  const queryClient = useQueryClient();

  const { data: orders, isPending } = useQuery({
    queryKey: ["manage-orders", term],
    queryFn: () => manageOrders({ data: { q: term } }),
  });

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["manage-orders"] });
    void queryClient.invalidateQueries({ queryKey: ["manage-stats"] });
  };

  const mutation = useMutation({
    mutationFn: (vars: { id: string; status: OrderStatus }) => setOrderStatus({ data: vars }),
    onSuccess: () => {
      refresh();
      toast.success("Order status updated and the customer has been told");
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

      {(orders ?? []).map((o) => {
        const mapUrl = deliveryMapUrl(o.address);
        return (
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
              {o.refunded > 0 && <p className="text-xs text-muted-foreground">Refunded {formatINR(o.refunded)}</p>}
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

          <Requests order={o} onDone={refresh} />

          <div className="mt-4 flex flex-wrap gap-2">
            {nextStatus(o.status) && (
              <Button
                size="sm"
                disabled={mutation.isPending}
                onClick={() => mutation.mutate({ id: o.id, status: nextStatus(o.status)! })}
              >
                <Check className="size-4" /> Mark {statusLabel(nextStatus(o.status)!).toLowerCase()}
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={() => printPackingSlip(o)}>
              <Printer className="size-4" /> Packing slip
            </Button>
            <Button size="sm" variant="outline" asChild>
              <a href={customerWhatsApp(o)} target="_blank" rel="noreferrer">
                <MessageCircle className="size-4" /> WhatsApp customer
              </a>
            </Button>
            {mapUrl && (
              <Button size="sm" variant="outline" asChild>
                <a href={mapUrl} target="_blank" rel="noreferrer"><MapPin className="size-4" /> View delivery pin</a>
              </Button>
            )}
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
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
            <InvoiceButton orderId={o.id} />
            <Button variant="ghost" size="sm" asChild>
              <Link to="/order/$id" params={{ id: o.id }} search={{ t: o.token }}>Open order page</Link>
            </Button>
          </div>

          <div className="mt-4 grid gap-4 border-t border-border pt-4 md:grid-cols-2">
            <TrackingForm order={o} onDone={refresh} />
            <RefundForm order={o} onDone={refresh} />
          </div>
        </div>
        );
      })}
    </div>
  );
}

function InvoiceButton({ orderId }: { orderId: string }) {
  const get = useServerFn(staffInvoice);
  const [busy, setBusy] = useState(false);
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        const res = await get({ data: { orderId } });
        setBusy(false);
        if ("error" in res) return toast.error(res.error);
        downloadPdf(res.base64, res.fileName);
      }}
    >
      {busy ? "Preparing…" : "Download invoice"}
    </Button>
  );
}

function Requests({ order, onDone }: { order: ManageOrder; onDone: () => void }) {
  const decide = useServerFn(decideOrderRequest);
  const [note, setNote] = useState("");
  const pending = order.requests.filter((r) => r.status === "pending");
  const past = order.requests.filter((r) => r.status !== "pending");
  if (order.requests.length === 0) return null;

  return (
    <div className="mt-4 grid gap-2">
      {pending.map((r) => (
        <div key={r.id} className="rounded-xl border border-primary/40 bg-accent p-4">
          <p className="text-sm font-semibold">
            {r.kind === "return" ? "Return requested" : "Cancellation requested"} — {r.reason}
          </p>
          {r.details && <p className="mt-1 text-sm text-muted-foreground">{r.details}</p>}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Input className="max-w-xs" placeholder="Note for the customer (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
            <Button
              size="sm"
              onClick={async () => {
                const res = await decide({ data: { requestId: r.id, approve: true, note } });
                res.ok ? toast.success("Approved and the customer has been told") : toast.error(res.error ?? "Could not do that");
                onDone();
              }}
            >
              Approve
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={async () => {
                const res = await decide({ data: { requestId: r.id, approve: false, note } });
                res.ok ? toast.success("Declined and the customer has been told") : toast.error(res.error ?? "Could not do that");
                onDone();
              }}
            >
              Decline
            </Button>
          </div>
        </div>
      ))}
      {past.map((r) => (
        <p key={r.id} className="text-xs text-muted-foreground">
          {r.kind === "return" ? "Return" : "Cancellation"} request ({r.reason}) — {r.status}
        </p>
      ))}
    </div>
  );
}

function TrackingForm({ order, onDone }: { order: ManageOrder; onDone: () => void }) {
  const save = useServerFn(setTracking);
  const [courier, setCourier] = useState(order.courierName ?? "");
  const [number, setNumber] = useState(order.trackingNumber ?? "");
  const [url, setUrl] = useState(order.trackingUrl ?? "");
  const [busy, setBusy] = useState(false);

  return (
    <div className="grid gap-2">
      <p className="text-sm font-semibold">Courier &amp; tracking</p>
      <Input placeholder="Courier name (e.g. Delhivery)" value={courier} onChange={(e) => setCourier(e.target.value)} />
      <Input placeholder="Tracking number" value={number} onChange={(e) => setNumber(e.target.value)} />
      <Input placeholder="Tracking link (optional)" value={url} onChange={(e) => setUrl(e.target.value)} />
      <Button
        size="sm"
        className="w-fit"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          const res = await save({ data: { id: order.id, courier, trackingNumber: number, trackingUrl: url, markShipped: true } });
          setBusy(false);
          if (!res.ok) return toast.error(res.error ?? "Could not save");
          toast.success("Tracking saved, order marked shipped and the customer told");
          onDone();
        }}
      >
        {busy ? "Saving…" : "Save & mark shipped"}
      </Button>
    </div>
  );
}

function RefundForm({ order, onDone }: { order: ManageOrder; onDone: () => void }) {
  const refund = useServerFn(recordRefund);
  const left = Math.max(0, order.total - order.refunded);
  const [amount, setAmount] = useState(String(left));
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <div className="grid gap-2">
      <p className="text-sm font-semibold">Refund</p>
      <p className="text-xs text-muted-foreground">
        {order.paymentStatus === "paid"
          ? "Paid online — the refund goes back to the customer's card or UPI automatically."
          : "Not paid online — this records the refund you handed back yourself."}
        {" "}Left to refund: {formatINR(left)}
      </p>
      <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
      <Input placeholder="Reason / note (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
      <Button
        size="sm"
        variant="outline"
        className="w-fit"
        disabled={busy || left <= 0}
        onClick={async () => {
          setBusy(true);
          const res = await refund({ data: { orderId: order.id, amount: Number(amount), note } });
          setBusy(false);
          if (!res.ok) return toast.error(res.error ?? "Could not record the refund");
          toast.success("Refund recorded and the customer told");
          onDone();
        }}
      >
        {busy ? "Working…" : "Record refund"}
      </Button>
    </div>
  );
}
