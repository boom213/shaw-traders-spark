import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AlertTriangle, Building2, Check, CreditCard, Landmark, MapPin, Truck, Wallet } from "lucide-react";
import { useId, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SectionHeading } from "@/components/site/Empty";
import { useStore } from "@/hooks/useStore";
import { useSiteOrdering } from "@/hooks/useOrderingMode";
import { supabase } from "@/integrations/supabase/client";
import { COUPON_KEY, readCoupon, useCartTotals, type AppliedCoupon } from "@/routes/cart";
import { previewCoupon } from "@/lib/shop-extras.functions";
import { canonical, formatINR } from "@/lib/catalog";
import { cn } from "@/lib/utils";
import { codAllowed, shopSettingsQuery, withTax } from "@/lib/shop-settings";
import { payWithRazorpay } from "@/lib/razorpay-client";
import { abandonPayment, paymentsAvailable, retryPayment, startCheckout, verifyPayment } from "@/lib/checkout.functions";

export const Route = createFileRoute("/checkout")({
  head: () => ({
    meta: [
      { title: "Checkout — Shaw Traders EV" },
      { name: "description", content: "Enter your delivery address, choose a delivery speed and pay securely by UPI, card, netbanking, wallet or cash on delivery." },
      { property: "og:title", content: "Checkout — Shaw Traders EV" },
      { property: "og:description", content: "Secure checkout for EV spare parts and accessories." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
    links: [{ rel: "canonical", href: canonical("/checkout") }],
  }),
  component: CheckoutPage,
});

const DELIVERY = [
  { code: "standard", id: "Standard Delivery", note: "3–6 working days", fee: 0 },
  { code: "express", id: "Express Delivery", note: "1–3 working days", fee: 120 },
  { code: "pickup", id: "Pickup at Bud Bud counter", note: "Ready in 2 hours", fee: 0 },
] as const;

const PAYMENT = [
  { id: "UPI", note: "Google Pay, PhonePe, Paytm", icon: Wallet, online: true },
  { id: "Card", note: "Debit or credit card", icon: CreditCard, online: true },
  { id: "Netbanking", note: "All major Indian banks", icon: Landmark, online: true },
  { id: "Cash on Delivery", note: "Pay when it arrives", icon: Truck, online: false },
] as const;

type PendingOrder = { orderId: string; humanId: string; token: string; total: number };

function CheckoutPage() {
  const navigate = useNavigate();
  const { mode: siteMode } = useSiteOrdering();
  const { clearCart, user } = useStore();
  const [coupon, setCoupon] = useState<AppliedCoupon | undefined>(() => readCoupon());
  const [couponCode, setCouponCode] = useState("");
  const { lines, loading, subtotal, discount } = useCartTotals(coupon);
  const { data: settings } = useQuery(shopSettingsQuery());
  const online = useServerFn(paymentsAvailable);
  const { data: availability } = useQuery({ queryKey: ["payments-available"], queryFn: () => online() });

  const start = useServerFn(startCheckout);
  const verify = useServerFn(verifyPayment);
  const retry = useServerFn(retryPayment);
  const abandon = useServerFn(abandonPayment);

  const [step, setStep] = useState(1);
  const [placing, setPlacing] = useState(false);
  const [pending, setPending] = useState<PendingOrder | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [addr, setAddr] = useState({
    name: "",
    phone: "",
    line1: "",
    landmark: "",
    city: "",
    state: "West Bengal",
    pincode: "",
  });
  const [delivery, setDelivery] = useState<(typeof DELIVERY)[number]>(DELIVERY[0]);
  const [payment, setPayment] = useState<string>(PAYMENT[0].id);

  const base = Math.max(0, subtotal - discount + delivery.fee);
  const taxed = settings ? withTax(base, settings) : { total: base, tax: 0 };
  const grand = taxed.total;
  const onlineReady = availability?.online === true;
  const cod = settings ? codAllowed(grand, addr.pincode, settings) : { allowed: true, reason: "" };

  if (loading) {
    return <div className="container-page py-16 text-center text-sm text-muted-foreground">Loading your cart…</div>;
  }

  if (!pending && lines.length === 0) {
    return (
      <div className="container-page py-16 text-center">
        <SectionHeading title="Checkout" />
        <p className="text-sm text-muted-foreground">Your cart is empty.</p>
        <Button className="mt-5" asChild><Link to="/shop">Browse parts</Link></Button>
      </div>
    );
  }

  const finish = async (order: PendingOrder, message: string) => {
    if (user) {
      await supabase.from("profiles").upsert({ id: user.id, full_name: addr.name, phone: addr.phone });
    }
    clearCart();
    window.localStorage.removeItem(COUPON_KEY);
    toast.success(message);
    void navigate({ to: "/order/$id", params: { id: order.orderId }, search: { t: order.token } });
  };

  /** Open Razorpay for an order that is waiting for payment. */
  const runPayment = async (
    order: PendingOrder,
    rzp: { keyId: string; orderId: string; amountPaise: number },
  ) => {
    setFailure(null);
    const result = await payWithRazorpay({
      keyId: rzp.keyId,
      orderId: rzp.orderId,
      amountPaise: rzp.amountPaise,
      name: "Shaw Traders EV",
      description: `Order ${order.humanId}`,
      prefill: { name: addr.name, contact: addr.phone, ...(user?.email ? { email: user.email } : {}) },
    });

    if (result.status === "success") {
      const check = await verify({
        data: {
          orderId: order.orderId,
          razorpayOrderId: result.payload.razorpay_order_id,
          paymentId: result.payload.razorpay_payment_id,
          signature: result.payload.razorpay_signature,
        },
      });
      if (check.paid) {
        await finish(order, `Payment received · order ${order.humanId}`);
        return;
      }
      setFailure(check.error ?? "We could not confirm this payment yet.");
      return;
    }

    setFailure(
      result.status === "dismissed"
        ? "You closed the payment window before it finished. Your cart is safe — you can pay again."
        : result.message,
    );
  };

  const placeOrder = async () => {
    const short = lines.find((l) => l.product.stock < l.qty);
    if (short) {
      toast.error(
        short.product.stock <= 0
          ? `${short.product.name} is out of stock. Please remove it from your cart.`
          : `Only ${short.product.stock} left of ${short.product.name}.`,
      );
      return;
    }
    if (payment === "Cash on Delivery" && !cod.allowed) return toast.error(cod.reason);
    if (payment !== "Cash on Delivery" && !onlineReady) {
      return toast.error("Online payment is not switched on yet. Please choose cash on delivery.");
    }

    setPlacing(true);
    const res = await start({
      data: {
        items: lines.map((l) => ({ productId: l.productId, qty: l.qty })),
        address: addr,
        shippingCode: delivery.code,
        paymentMethod: payment,
        ...(coupon ? { coupon: coupon.code } : {}),
      },
    });
    setPlacing(false);

    if ("error" in res) return toast.error(res.error);

    const order: PendingOrder = { orderId: res.orderId, humanId: res.humanId, token: res.token, total: res.total };

    if (!res.razorpay) {
      await finish(order, `Order ${res.humanId} placed — pay cash on delivery`);
      return;
    }

    setPending(order);
    await runPayment(order, res.razorpay);
  };

  const tryAgain = async () => {
    if (!pending) return;
    setPlacing(true);
    const res = await retry({ data: { orderId: pending.orderId } });
    setPlacing(false);
    if ("error" in res) return toast.error(res.error);
    await runPayment(pending, { keyId: res.keyId, orderId: res.razorpayOrderId, amountPaise: res.amountPaise });
  };

  const cancelOrder = async () => {
    if (!pending) return;
    await abandon({ data: { orderId: pending.orderId } });
    setPending(null);
    setFailure(null);
    toast.message("Payment cancelled. Your cart is still here.");
  };

  // Retry screen — shown after a failed, cancelled or timed-out payment.
  if (pending && failure) {
    return (
      <div className="container-page grid place-items-center py-16">
        <div className="w-full max-w-md rounded-3xl border border-border bg-card p-7 text-center shadow-[var(--shadow-card)]">
          <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-surface text-primary">
            <AlertTriangle className="size-6" />
          </span>
          <h1 className="mt-4 font-display text-2xl font-bold">Payment not completed</h1>
          <p className="mt-2 text-sm text-muted-foreground">{failure}</p>
          <p className="mt-3 rounded-xl border border-border bg-surface p-3 text-sm">
            Order <strong>{pending.humanId}</strong> · {formatINR(pending.total)} is held for you. Nothing has been charged.
          </p>
          <div className="mt-5 grid gap-2">
            <Button size="lg" disabled={placing} onClick={() => void tryAgain()}>
              {placing ? "Opening payment…" : `Pay ${formatINR(pending.total)} again`}
            </Button>
            <Button variant="outline" onClick={() => void cancelOrder()}>Cancel this order</Button>
          </div>
        </div>
      </div>
    );
  }

  const steps = [
    { n: 1, label: "Address", icon: MapPin },
    { n: 2, label: "Delivery", icon: Truck },
    { n: 3, label: "Payment", icon: Wallet },
  ];

  if (siteMode !== "full") {
    return (
      <div className="container-page py-16 text-center">
        <SectionHeading title="Online ordering is paused" subtitle="You can still browse the catalogue and ask us about any part." />
        <Button className="mt-4" asChild><Link to="/shop">Browse parts</Link></Button>
      </div>
    );
  }

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
                    key={d.code}
                    onClick={() => setDelivery(d)}
                    className={cn("flex items-center justify-between rounded-xl border px-4 py-3 text-left", delivery.code === d.code ? "border-primary bg-accent" : "border-border")}
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
                {PAYMENT.map((p) => {
                  const disabled = p.online ? !onlineReady : !cod.allowed;
                  return (
                    <button
                      key={p.id}
                      disabled={disabled}
                      onClick={() => setPayment(p.id)}
                      className={cn(
                        "flex items-center gap-3 rounded-xl border px-4 py-3 text-left",
                        payment === p.id ? "border-primary bg-accent" : "border-border",
                        disabled && "cursor-not-allowed opacity-50",
                      )}
                    >
                      <p.icon className="size-5 text-primary" />
                      <span>
                        <span className="block text-sm font-semibold">{p.id}</span>
                        <span className="block text-xs text-muted-foreground">
                          {p.online ? (onlineReady ? p.note : "Not available yet") : cod.allowed ? p.note : cod.reason}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground">
                Online payments are handled securely by Razorpay — UPI, cards, netbanking and wallets. Your cart stays untouched until the payment succeeds.
              </p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(2)}>Back</Button>
                <Button size="lg" disabled={placing} onClick={() => void placeOrder()}>
                  {placing
                    ? "Please wait…"
                    : payment === "Cash on Delivery"
                      ? `Place order · ${formatINR(grand)}`
                      : `Pay ${formatINR(grand)}`}
                </Button>
              </div>
            </div>
          )}
        </div>

        <aside className="h-fit rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)] lg:sticky lg:top-32">
          <h3 className="font-display text-base font-bold">Order summary</h3>
          <ul className="mt-4 grid gap-2 text-sm">
            {lines.map((l) => (
              <li key={l.productId} className="flex justify-between gap-3">
                <span className="line-clamp-1 text-muted-foreground">{l.qty} × {l.product.name}</span>
                <span>{l.product.price !== undefined ? formatINR(l.product.price * l.qty) : "On request"}</span>
              </li>
            ))}
          </ul>
          <div className="mt-4 border-t border-border pt-4">
            <Label className="text-xs">Discount code</Label>
            <div className="mt-1.5 flex gap-2">
              <Input
                placeholder="Enter code"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value)}
              />
              <Button
                type="button"
                variant="outline"
                onClick={async () => {
                  const entered = couponCode.trim();
                  if (!entered) return;
                  const res = await previewCoupon({ data: { code: entered, subtotal } });
                  if (!res.valid) {
                    toast.error(res.message);
                    return;
                  }
                  const next = { code: entered.toUpperCase(), discount: res.discount };
                  setCoupon(next);
                  window.localStorage.setItem(COUPON_KEY, JSON.stringify(next));
                  toast.success(`Code applied — you save ${formatINR(res.discount)}`);
                }}
              >
                Apply
              </Button>
            </div>
            {coupon && (
              <p className="mt-2 flex items-center gap-2 text-xs text-primary">
                Code {coupon.code} applied
                <button
                  type="button"
                  className="text-muted-foreground underline"
                  onClick={() => {
                    setCoupon(undefined);
                    window.localStorage.removeItem(COUPON_KEY);
                  }}
                >
                  remove
                </button>
              </p>
            )}
          </div>

          <dl className="mt-4 grid gap-2 border-t border-border pt-4 text-sm">
            <div className="flex justify-between"><dt className="text-muted-foreground">Subtotal</dt><dd>{formatINR(subtotal)}</dd></div>
            {discount > 0 && (
              <div className="flex justify-between"><dt className="text-muted-foreground">Discount</dt><dd className="text-primary">−{formatINR(discount)}</dd></div>
            )}
            <div className="flex justify-between"><dt className="text-muted-foreground">{delivery.id}</dt><dd>{delivery.fee === 0 ? "Free" : formatINR(delivery.fee)}</dd></div>
            {settings?.gstEnabled && taxed.tax > 0 && (
              <div className="flex justify-between">
                <dt className="text-muted-foreground">
                  GST {settings.gstRate}% {settings.pricesIncludeGst ? "(included)" : ""}
                </dt>
                <dd>{formatINR(taxed.tax)}</dd>
              </div>
            )}
            <div className="mt-2 flex justify-between border-t border-border pt-3 font-display text-lg font-bold"><dt>Total</dt><dd>{formatINR(grand)}</dd></div>
          </dl>
          {settings?.gstin && (
            <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
              <Building2 className="size-3.5" /> GSTIN {settings.gstin}
            </p>
          )}
        </aside>
      </div>
    </div>
  );
}

function F({ label, v, on }: { label: string; v: string; on: (s: string) => void }) {
  const id = useId();
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id} className="text-xs">{label}</Label>
      <Input id={id} value={v} onChange={(e) => on(e.target.value)} />
    </div>
  );
}
