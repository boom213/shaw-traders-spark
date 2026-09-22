import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Check, CreditCard, MapPin, Truck, Wallet } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SectionHeading } from "@/components/site/Empty";
import { useStore } from "@/hooks/useStore";
import { useCartTotals } from "@/routes/cart";
import { formatINR, type Order } from "@/lib/catalog";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/checkout")({
  head: () => ({
    meta: [
      { title: "Checkout — Shaw Traders EV" },
      { name: "description", content: "Enter your delivery address, choose a delivery speed and payment method to complete your EV parts order with Shaw Traders EV." },
      { property: "og:title", content: "Checkout — Shaw Traders EV" },
      { property: "og:description", content: "Secure checkout for EV spare parts and accessories." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CheckoutPage,
});

const DELIVERY = [
  { id: "Standard Delivery", note: "3–6 working days", fee: 0 },
  { id: "Express Delivery", note: "1–3 working days", fee: 120 },
  { id: "Pickup at Bud Bud counter", note: "Ready in 2 hours", fee: 0 },
];

const PAYMENT = [
  { id: "UPI", note: "Google Pay, PhonePe, Paytm", icon: Wallet },
  { id: "Card", note: "Debit or credit card", icon: CreditCard },
  { id: "Cash on Delivery", note: "Pay when it arrives", icon: Truck },
];

function newOrderId() {
  const d = new Date();
  const ymd = `${d.getFullYear().toString().slice(2)}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  return `STE-${ymd}-${Math.floor(1000 + Math.random() * 9000)}`;
}

function CheckoutPage() {
  const navigate = useNavigate();
  const { state, addOrder, clearCart, update } = useStore();
  const { lines, subtotal, shipping, total } = useCartTotals();
  const [step, setStep] = useState(1);
  const [addr, setAddr] = useState({
    name: state.profile?.name ?? "",
    phone: state.profile?.phone ?? "",
    line1: "",
    landmark: "",
    city: "",
    state: "West Bengal",
    pincode: "",
  });
  const [delivery, setDelivery] = useState(DELIVERY[0]!);
  const [payment, setPayment] = useState(PAYMENT[0]!.id);

  const grand = total + delivery.fee;

  if (lines.length === 0) {
    return (
      <div className="container-page py-16 text-center">
        <SectionHeading title="Checkout" />
        <p className="text-sm text-muted-foreground">Your cart is empty.</p>
        <Button className="mt-5" asChild><Link to="/shop">Browse parts</Link></Button>
      </div>
    );
  }

  const placeOrder = () => {
    const order: Order = {
      id: newOrderId(),
      createdAt: Date.now(),
      status: "Order Confirmed",
      items: lines.map((l) => ({
        productId: l.productId,
        name: l.product!.name,
        ...(l.product!.price !== undefined ? { price: l.product!.price } : {}),
        qty: l.qty,
        ...(l.product!.images[0] ? { image: l.product!.images[0]! } : {}),
      })),
      address: addr,
      shippingMethod: `${delivery.id} (${delivery.note})`,
      paymentMethod: payment,
      total: grand,
    };
    addOrder(order);
    update((s) => ({
      ...s,
      addresses: [addr, ...s.addresses.filter((a) => a.phone !== addr.phone)],
      profile: { ...(s.profile ?? {}), name: addr.name, phone: addr.phone },
    }));
    clearCart();
    toast.success(`Order ${order.id} placed`);
    navigate({ to: "/order/$id", params: { id: order.id } });
  };

  const steps = [
    { n: 1, label: "Address", icon: MapPin },
    { n: 2, label: "Delivery", icon: Truck },
    { n: 3, label: "Payment", icon: Wallet },
  ];

  return (
    <div className="container-page py-10">
      <SectionHeading title="Checkout" subtitle="Three quick steps — address, delivery and payment." />

      <ol className="mb-8 flex items-center gap-3">
        {steps.map((s) => (
          <li key={s.n} className="flex flex-1 items-center gap-2">
            <span className={cn("grid size-8 shrink-0 place-items-center rounded-full border text-xs font-bold", step >= s.n ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground")}>
              {step > s.n ? <Check className="size-4" /> : s.n}
            </span>
            <span className={cn("text-sm font-semibold", step >= s.n ? "text-foreground" : "text-muted-foreground")}>{s.label}</span>
            {s.n < 3 && <span className="hidden h-px flex-1 bg-border sm:block" />}
          </li>
        ))}
      </ol>

      <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
          {step === 1 && (
            <div className="grid gap-4">
              <h3 className="font-display text-base font-bold">Delivery address</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <F label="Full name" v={addr.name} on={(v) => setAddr({ ...addr, name: v })} />
                <F label="Phone number" v={addr.phone} on={(v) => setAddr({ ...addr, phone: v })} />
              </div>
              <F label="House no., street, area" v={addr.line1} on={(v) => setAddr({ ...addr, line1: v })} />
              <div className="grid gap-3 sm:grid-cols-2">
                <F label="Landmark (optional)" v={addr.landmark} on={(v) => setAddr({ ...addr, landmark: v })} />
                <F label="City / town" v={addr.city} on={(v) => setAddr({ ...addr, city: v })} />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <F label="State" v={addr.state} on={(v) => setAddr({ ...addr, state: v })} />
                <F label="PIN code" v={addr.pincode} on={(v) => setAddr({ ...addr, pincode: v })} />
              </div>
              <Button
                className="mt-1 w-fit"
                onClick={() => {
                  if (!addr.name.trim() || !/^\d{10}$/.test(addr.phone.trim()) || !addr.line1.trim() || !/^\d{6}$/.test(addr.pincode.trim())) {
                    return toast.error("Please add name, a 10-digit phone, address and a 6-digit PIN code");
                  }
                  setStep(2);
                }}
              >
                Continue to delivery
              </Button>
            </div>
          )}

          {step === 2 && (
            <div className="grid gap-4">
              <h3 className="font-display text-base font-bold">Delivery option</h3>
              <div className="grid gap-2">
                {DELIVERY.map((d) => (
                  <button
                    key={d.id}
                    onClick={() => setDelivery(d)}
                    className={cn("flex items-center justify-between rounded-xl border px-4 py-3 text-left", delivery.id === d.id ? "border-primary bg-accent" : "border-border")}
                  >
                    <span>
                      <span className="block text-sm font-semibold">{d.id}</span>
                      <span className="block text-xs text-muted-foreground">{d.note}</span>
                    </span>
                    <span className="text-sm font-semibold">{d.fee === 0 ? "Free" : formatINR(d.fee)}</span>
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
                <Button onClick={() => setStep(3)}>Continue to payment</Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="grid gap-4">
              <h3 className="font-display text-base font-bold">Payment method</h3>
              <div className="grid gap-2">
                {PAYMENT.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setPayment(p.id)}
                    className={cn("flex items-center gap-3 rounded-xl border px-4 py-3 text-left", payment === p.id ? "border-primary bg-accent" : "border-border")}
                  >
                    <p.icon className="size-5 text-primary" />
                    <span>
                      <span className="block text-sm font-semibold">{p.id}</span>
                      <span className="block text-xs text-muted-foreground">{p.note}</span>
                    </span>
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Online payments are confirmed by our team on WhatsApp before dispatch. Items marked "price on request" are billed separately.
              </p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(2)}>Back</Button>
                <Button size="lg" onClick={placeOrder}>Place order · {formatINR(grand)}</Button>
              </div>
            </div>
          )}
        </div>

        <aside className="h-fit rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)] lg:sticky lg:top-32">
          <h3 className="font-display text-base font-bold">Order summary</h3>
          <ul className="mt-4 grid gap-2 text-sm">
            {lines.map((l) => (
              <li key={l.productId} className="flex justify-between gap-3">
                <span className="line-clamp-1 text-muted-foreground">{l.qty} × {l.product!.name}</span>
                <span>{l.product!.price !== undefined ? formatINR(l.product!.price * l.qty) : "On request"}</span>
              </li>
            ))}
          </ul>
          <dl className="mt-4 grid gap-2 border-t border-border pt-4 text-sm">
            <div className="flex justify-between"><dt className="text-muted-foreground">Subtotal</dt><dd>{formatINR(subtotal)}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">Shipping</dt><dd>{shipping === 0 ? "Free" : formatINR(shipping)}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">{delivery.id}</dt><dd>{delivery.fee === 0 ? "Free" : formatINR(delivery.fee)}</dd></div>
            <div className="mt-2 flex justify-between border-t border-border pt-3 font-display text-lg font-bold"><dt>Total</dt><dd>{formatINR(grand)}</dd></div>
          </dl>
        </aside>
      </div>
    </div>
  );
}

function F({ label, v, on }: { label: string; v: string; on: (s: string) => void }) {
  return (
    <div className="grid gap-1.5">
      <Label className="text-xs">{label}</Label>
      <Input value={v} onChange={(e) => on(e.target.value)} />
    </div>
  );
}
