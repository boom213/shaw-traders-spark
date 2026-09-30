import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AlertTriangle, Building2, Check, CreditCard, Landmark, MapPin, Plus, Truck, Wallet } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { SectionHeading } from "@/components/site/Empty";
import { SparkCharge, SparkRing } from "@/components/site/SparkLoaders";
import { PhoneOtpForm } from "@/components/site/PhoneOtpForm";
import { AddressFields, EMPTY_ADDRESS, validateCustomerAddress, type CustomerAddressInput } from "@/components/site/AddressFields";
import { useStore } from "@/hooks/useStore";
import { useSiteOrdering } from "@/hooks/useOrderingMode";
import { lovable } from "@/integrations/lovable/index";
import { supabase } from "@/integrations/supabase/client";
import { COUPON_KEY, readCoupon, useCartTotals, type AppliedCoupon } from "@/routes/cart";
import { previewCoupon } from "@/lib/shop-extras.functions";
import { canonical, formatINR } from "@/lib/catalog";
import { cn } from "@/lib/utils";
import { errorCount, focusFirstInvalid, validationSummary } from "@/lib/form-validation";
import { codAllowed, minimumOrderShortfall, shopSettingsQuery, withTax } from "@/lib/shop-settings";
import { payWithRazorpay } from "@/lib/razorpay-client";
import { useTradeAccount } from "@/hooks/useTrade";
import { usePaymentConfirmation } from "@/hooks/usePaymentConfirmation";
import { usePurchaseAccess } from "@/hooks/usePurchaseAccess";
import { abandonPayment, getMyAddresses, paymentState, paymentsAvailable, retryPayment, startCheckout, verifyPayment, type CheckoutAddress } from "@/lib/checkout.functions";

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
  { code: "freight", id: "Transport / freight", note: "Sent by transport, freight paid to the transporter", fee: 0 },
] as const;

const PAYMENT = [
  { id: "UPI", note: "Google Pay, PhonePe, Paytm", icon: Wallet, online: true },
  { id: "Card", note: "Debit or credit card", icon: CreditCard, online: true },
  { id: "Netbanking", note: "All major Indian banks", icon: Landmark, online: true },
  { id: "Cash on Delivery", note: "Currently not available — please pay online", icon: Truck, online: false },
  { id: "Credit (account)", note: "Added to your wholesale account", icon: Truck, online: false },
] as const;

type PendingOrder = { orderId: string; humanId: string; token: string; total: number };
const PENDING_CHECKOUT_KEY = "shaw-ev-pending-checkout";
const addressInput = (address: CheckoutAddress): CustomerAddressInput => ({
  name: address.name ?? "",
  phone: address.phone ?? "",
  alternatePhone: address.alternate_phone ?? "",
  line1: address.line1 ?? "",
  landmark: address.landmark ?? "",
  city: address.city ?? "",
  state: address.state ?? "West Bengal",
  pincode: address.pincode ?? "",
});

function CheckoutPage() {
  const navigate = useNavigate();
  const { mode: siteMode } = useSiteOrdering();
  const { authReady, clearCart, user } = useStore();
  const purchase = usePurchaseAccess();
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
  const readPaymentState = useServerFn(paymentState);

  const [step, setStep] = useState(1);
  const [placing, setPlacing] = useState(false);
  const [pending, setPending] = useState<PendingOrder | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [pollArmed, setPollArmed] = useState(false);
  const recoveryStarted = useRef(false);
  const [addr, setAddr] = useState<CustomerAddressInput>(EMPTY_ADDRESS);
  const [addressSubmitted, setAddressSubmitted] = useState(false);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null | undefined>(undefined);
  const [saveAddress, setSaveAddress] = useState(false);
  const [makeDefault, setMakeDefault] = useState(false);
  const [delivery, setDelivery] = useState<(typeof DELIVERY)[number]>(DELIVERY[0]);
  const [payment, setPayment] = useState<string>(PAYMENT[0].id);
  const { account, isTrade } = useTradeAccount();
  const [freight, setFreight] = useState({ transportName: "", lrNumber: "" });
  const loadAddresses = useServerFn(getMyAddresses);
  const { data: savedAddresses = [], isFetched: addressesFetched } = useQuery({
    queryKey: ["my-addresses", user?.id],
    queryFn: () => loadAddresses(),
    enabled: Boolean(user),
  });

  useEffect(() => {
    if (!addressesFetched || selectedAddressId !== undefined) return;
    const initial = savedAddresses.find((address) => address.is_default) ?? savedAddresses[0];
    if (initial) {
      setSelectedAddressId(initial.id);
      setAddr(addressInput(initial));
    } else {
      setSelectedAddressId(null);
    }
  }, [addressesFetched, savedAddresses, selectedAddressId]);

  const base = Math.max(0, subtotal - discount + delivery.fee);
  const goodsTotal = Math.max(0, subtotal - discount);
  const taxed = settings ? withTax(base, settings) : { total: base, tax: 0 };
  const grand = taxed.total;
  const onlineReady = availability?.online === true;
  const cod = settings ? codAllowed(grand, addr.pincode, settings) : { allowed: true, reason: "" };
  const minimumShortfall = settings ? minimumOrderShortfall(goodsTotal, settings) : 0;
  const addressErrors = addressSubmitted ? validateCustomerAddress(addr) : {};

  const finish = async (order: PendingOrder, message: string) => {
    if (user) {
      await supabase.from("profiles").upsert({ id: user.id, full_name: addr.name, phone: addr.phone });
    }
    await clearCart();
    window.localStorage.removeItem(COUPON_KEY);
    window.sessionStorage.removeItem(PENDING_CHECKOUT_KEY);
    toast.success(message);
    void navigate({ to: "/order/$id", params: { id: order.orderId }, search: { t: order.token } });
  };

  useEffect(() => {
    if (!authReady || !user || recoveryStarted.current) return;
    const raw = window.sessionStorage.getItem(PENDING_CHECKOUT_KEY);
    if (!raw) return;
    recoveryStarted.current = true;
    let stored: PendingOrder;
    try {
      stored = JSON.parse(raw) as PendingOrder;
    } catch {
      window.sessionStorage.removeItem(PENDING_CHECKOUT_KEY);
      return;
    }
    if (!stored.orderId || !stored.humanId || !stored.token) {
      window.sessionStorage.removeItem(PENDING_CHECKOUT_KEY);
      return;
    }
    setPending(stored);
    void readPaymentState({ data: { orderId: stored.orderId } }).then(async (latest) => {
      if (latest.status === "paid") {
        await clearCart();
        window.localStorage.removeItem(COUPON_KEY);
        window.sessionStorage.removeItem(PENDING_CHECKOUT_KEY);
        toast.success(`Payment received · order ${stored.humanId}`);
        void navigate({ to: "/order/$id", params: { id: stored.orderId }, search: { t: stored.token } });
        return;
      }
      if (latest.status === "pending") {
        setFailure("Your payment is not confirmed yet. You can try again or cancel this order.");
        return;
      }
      window.sessionStorage.removeItem(PENDING_CHECKOUT_KEY);
      setPending(null);
    });
  }, [authReady, user, readPaymentState, clearCart, navigate]);

  const { phase: confirmationPhase } = usePaymentConfirmation<{ status: string }>({
    armed: pollArmed && Boolean(pending),
    check: () => pending ? readPaymentState({ data: { orderId: pending.orderId } }) : Promise.resolve({ status: "unknown" as const }),
    isConfirmed: (result) => result.status === "paid",
    onConfirmed: () => {
      if (!pending) return;
      setPollArmed(false);
      void finish(pending, `Payment received · order ${pending.humanId}`);
    },
    onTimeout: () => {
      setPollArmed(false);
      setFailure("We could not confirm this payment yet. If money was deducted, please do not pay again until staff checks it.");
    },
  });

  if (loading || !authReady || (user && !purchase.ready)) {
    return <div className="container-page"><SparkCharge label="Loading your cart…" /></div>;
  }

  if (!user) return <CheckoutSignIn />;

  if (!purchase.eligible) {
    return (
      <div className="container-page py-16 text-center">
        <SectionHeading title="Retail checkout only" subtitle="Online checkout is available only to retail customer accounts. Your saved cart has not been changed." />
        <Button className="mt-5" asChild><Link to={purchase.reason === "trade" ? "/trade" : "/manage"}>{purchase.reason === "trade" ? "Wholesale ordering" : "Open staff portal"}</Link></Button>
      </div>
    );
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

  /** Open Razorpay for an order that is waiting for payment. */
  const runPayment = async (
    order: PendingOrder,
    rzp: { keyId: string; orderId: string; amountPaise: number },
  ) => {
    setFailure(null);
    window.sessionStorage.setItem(PENDING_CHECKOUT_KEY, JSON.stringify(order));
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
      setFailure(check.error ?? "We could not confirm this payment yet. If money was deducted, please do not pay again.");
      setPollArmed(true);
      return;
    }

    setFailure(
      result.status === "dismissed"
        ? "You closed the payment window before it finished. Your cart is safe — you can pay again."
        : result.message,
    );
  };

  const placeOrder = async () => {
    if (minimumShortfall > 0 && settings) {
      return toast.error(`Add ${formatINR(minimumShortfall)} more to reach the ${formatINR(settings.minOrderValue)} minimum order value.`);
    }
    const unavailable = lines.find((line) => !line.product);
    if (unavailable) return toast.error("A product in your cart is no longer available. Please remove it before checkout.");
    const availableLines = lines.flatMap((line) => line.product ? [{ ...line, product: line.product }] : []);
    const short = availableLines.find((line) => line.product.stock < line.qty);
    if (short) {
      toast.error(
        short.product.stock <= 0
          ? `${short.product.name} is out of stock. Please remove it from your cart.`
          : `Only ${short.product.stock} left of ${short.product.name}.`,
      );
      return;
    }
    if (payment === "Cash on Delivery" && !cod.allowed) return toast.error(cod.reason);
    if (payment === "Credit (account)" && !isTrade) return toast.error("Credit is only for approved trade accounts.");
    if (payment !== "Cash on Delivery" && payment !== "Credit (account)" && !onlineReady) {
      return toast.error("Online payment is not switched on yet. Please try again later.");
    }

    setPlacing(true);
    const res = await start({
      data: {
        items: availableLines.map((line) => ({ productId: line.productId, qty: line.qty })),
        address: addr,
        shippingCode: delivery.code,
        paymentMethod: payment,
        ...(delivery.code === "freight" ? { transportName: freight.transportName, lrNumber: freight.lrNumber } : {}),
        ...(coupon ? { coupon: coupon.code } : {}),
      },
    });
    setPlacing(false);

    if ("error" in res) return toast.error(res.error);

    if (selectedAddressId === null && saveAddress && user) {
      if (makeDefault) {
        const clear = await supabase.from("addresses").update({ is_default: false }).eq("profile_id", user.id).eq("is_default", true);
        if (clear.error) {
          toast.error("Order placed, but your saved addresses could not be updated");
          return finishAfterAddressSave(res);
        }
      }
      const { error: saveError } = await supabase.from("addresses").insert({
        profile_id: user.id,
        name: addr.name.trim(),
        phone: addr.phone,
        alternate_phone: addr.alternatePhone || null,
        line1: addr.line1.trim(),
        landmark: addr.landmark.trim() || null,
        city: addr.city.trim(),
        state: addr.state.trim(),
        pincode: addr.pincode,
        is_default: makeDefault,
      });
      if (saveError) toast.error("Order placed, but this address could not be saved");
    }

    await finishAfterAddressSave(res);
  };

  const finishAfterAddressSave = async (res: Exclude<Awaited<ReturnType<typeof start>>, { error: string }>) => {
    const order: PendingOrder = { orderId: res.orderId, humanId: res.humanId, token: res.token, total: res.total };

    if (!res.razorpay) {
      await finish(
        order,
        payment === "Credit (account)"
          ? `Order ${res.humanId} placed on your account`
          : `Order ${res.humanId} placed — pay cash on delivery`,
      );
      return;
    }

    setPending(order);
    await runPayment(order, res.razorpay);
  };

  const tryAgain = async () => {
    if (!pending) return;
    setPlacing(true);
    const latest = await readPaymentState({ data: { orderId: pending.orderId } });
    if (latest.status === "paid") {
      setPlacing(false);
      await finish(pending, `Payment received · order ${pending.humanId}`);
      return;
    }
    const res = await retry({ data: { orderId: pending.orderId } });
    setPlacing(false);
    if ("error" in res) return toast.error(res.error);
    await runPayment(pending, { keyId: res.keyId, orderId: res.razorpayOrderId, amountPaise: res.amountPaise });
  };

  const cancelOrder = async () => {
    if (!pending) return;
    setPollArmed(false);
    await abandon({ data: { orderId: pending.orderId } });
    window.sessionStorage.removeItem(PENDING_CHECKOUT_KEY);
    setPending(null);
    setFailure(null);
    toast.message("Payment cancelled. Your cart is still here.");
  };

  if (pending && pollArmed && confirmationPhase !== "grace") {
    return (
      <div className="container-page grid place-items-center py-16">
        <div className="w-full max-w-md rounded-3xl border border-border bg-card p-7 text-center shadow-[var(--shadow-card)]">
          <SparkCharge label="Checking with your bank…" />
          <p className="mt-3 text-sm text-muted-foreground">Please do not pay again or close this page.</p>
        </div>
      </div>
    );
  }

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
              {placing ? <SparkRing /> : null}{placing ? "Opening payment…" : `Pay ${formatINR(pending.total)} again`}
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
              {savedAddresses.length > 0 && (
                <div className="grid gap-2">
                  <p className="text-sm font-medium">Choose a saved address</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {savedAddresses.map((address) => (
                      <Button key={address.id} type="button" variant="outline" className={cn("h-auto min-h-24 items-start justify-start whitespace-normal p-3 text-left", selectedAddressId === address.id && "border-primary bg-accent")} onClick={() => { setSelectedAddressId(address.id); setAddr(addressInput(address)); setAddressSubmitted(false); setSaveAddress(false); setMakeDefault(false); }}>
                        <MapPin className="mt-0.5 size-4 shrink-0" />
                        <span><span className="block font-semibold">{address.name}{address.is_default ? " · Default" : ""}</span><span className="block text-xs text-muted-foreground">{address.phone}</span><span className="block text-xs text-muted-foreground">{[address.line1, address.city, address.state, address.pincode].filter(Boolean).join(", ")}</span></span>
                      </Button>
                    ))}
                    <Button type="button" variant="outline" className={cn("h-auto min-h-24 justify-start p-3", selectedAddressId === null && "border-primary bg-accent")} onClick={() => { setSelectedAddressId(null); setAddr(EMPTY_ADDRESS); setAddressSubmitted(false); setSaveAddress(false); setMakeDefault(false); }}>
                      <Plus className="size-4" /> Use a new address
                    </Button>
                  </div>
                </div>
              )}
              <AddressFields value={addr} onChange={setAddr} errors={addressErrors} />
              {selectedAddressId === null && (
                <div className="grid gap-2 rounded-lg border border-border bg-surface p-3">
                  <label className="flex cursor-pointer items-center gap-2 text-sm"><Checkbox checked={saveAddress} onCheckedChange={(checked) => { setSaveAddress(checked === true); if (checked !== true) setMakeDefault(false); }} />Save this address for next time</label>
                  {saveAddress && <label className="flex cursor-pointer items-center gap-2 pl-6 text-sm text-muted-foreground"><Checkbox checked={makeDefault} onCheckedChange={(checked) => setMakeDefault(checked === true)} />Make this my default address</label>}
                </div>
              )}
              <Button
                className="mt-1 w-fit"
                onClick={() => {
                  setAddressSubmitted(true);
                  const validationErrors = validateCustomerAddress(addr);
                  if (errorCount(validationErrors) > 0) {
                    toast.error(validationSummary(validationErrors));
                    focusFirstInvalid();
                    return;
                  }
                  setAddressSubmitted(false);
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
                {DELIVERY.filter((d) => d.code !== "freight" || isTrade).map((d) => (
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
              {delivery.code === "freight" && (
                <div className="grid gap-2 sm:grid-cols-2">
                  <Input
                    placeholder="Transport company"
                    aria-label="Transport company"
                    value={freight.transportName}
                    onChange={(e) => setFreight((f) => ({ ...f, transportName: e.target.value }))}
                  />
                  <Input
                    placeholder="LR number (if you have it)"
                    aria-label="LR number"
                    value={freight.lrNumber}
                    onChange={(e) => setFreight((f) => ({ ...f, lrNumber: e.target.value }))}
                  />
                </div>
              )}
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
                {PAYMENT.filter((p) => p.id !== "Credit (account)" || isTrade).map((p) => {
                  const disabled =
                    p.id === "Credit (account)"
                      ? !isTrade || Boolean(account?.overdue)
                      : p.online
                        ? !onlineReady
                        : !cod.allowed;
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
                          {p.id === "Credit (account)"
                            ? account?.overdue
                              ? "You have an overdue bill — please clear it first"
                              : p.note
                            : p.online
                              ? onlineReady
                                ? p.note
                                : "Not available yet"
                              : cod.allowed
                                ? p.note
                                : cod.reason}
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
                <Button size="lg" disabled={placing || minimumShortfall > 0} onClick={() => void placeOrder()}>
                  {placing ? <SparkRing /> : null}{placing
                    ? "Please wait…"
                    : payment === "Cash on Delivery"
                      ? `Place order · ${formatINR(grand)}`
                      : payment === "Credit (account)"
                        ? `Place order on account · ${formatINR(grand)}`
                      : `Pay ${formatINR(grand)}`}
                </Button>
              </div>
            </div>
          )}
        </div>

        <aside className="h-fit rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)] lg:sticky lg:top-32">
          <h3 className="font-display text-base font-bold">Order summary</h3>
          <ul className="mt-4 grid gap-2 text-sm">
            {lines.map((line) => (
              <li key={line.productId} className="flex justify-between gap-3">
                <span className="line-clamp-1 text-muted-foreground">{line.qty} × {line.product?.name ?? "This part is no longer available"}</span>
                <span>{line.product?.price !== undefined ? formatINR(line.product.price * line.qty) : line.product ? "On request" : "—"}</span>
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
          {minimumShortfall > 0 && settings && (
            <p className="mt-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm font-medium text-destructive">
              Add {formatINR(minimumShortfall)} more to reach the {formatINR(settings.minOrderValue)} minimum order value.
            </p>
          )}
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

function CheckoutSignIn() {
  const [googleBusy, setGoogleBusy] = useState(false);

  const google = async () => {
    setGoogleBusy(true);
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: `${window.location.origin}/checkout` });
    if (result.redirected) return;
    setGoogleBusy(false);
    if (result.error) toast.error(result.error.message || "Google sign-in failed");
  };

  return (
    <div className="container-page py-10 sm:py-14">
      <SectionHeading
        as="h1"
        title="Please sign in to continue"
        subtitle="Your cart is saved. Sign in to enter your delivery details and place your order."
      />
      <div className="mx-auto mt-6 w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-card)]">
        <PhoneOtpForm idPrefix="checkout" />
        <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
          <span className="h-px flex-1 bg-border" />
          or
          <span className="h-px flex-1 bg-border" />
        </div>
        <Button type="button" variant="outline" className="w-full" disabled={googleBusy} onClick={() => void google()}>
          {googleBusy ? <SparkRing /> : null}{googleBusy ? "Please wait…" : "Continue with Google"}
        </Button>
      </div>
    </div>
  );
}

