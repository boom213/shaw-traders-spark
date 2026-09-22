import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loadQuote } from "@/lib/quote.functions";
import { startCheckout, verifyPayment } from "@/lib/checkout.functions";
import { payWithRazorpay } from "@/lib/razorpay-client";
import { formatINR } from "@/lib/catalog";

export const Route = createFileRoute("/quote/$token")({
  head: () => ({
    meta: [
      { title: "Your price quote — Shaw Traders EV" },
      { name: "description", content: "The price Shaw Traders EV quoted for the part you asked about, ready to pay and order." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Your price quote — Shaw Traders EV" },
      { property: "og:description", content: "Pay for the part Shaw Traders EV quoted you." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: QuotePage,
});

function QuotePage() {
  const { token } = Route.useParams();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [addr, setAddr] = useState({ name: "", phone: "", line1: "", city: "Bud Bud", state: "West Bengal", pincode: "" });

  const { data: quote, isPending } = useQuery({
    queryKey: ["quote", token],
    queryFn: () => loadQuote({ data: { token } }),
  });

  const set = (k: keyof typeof addr) => (e: React.ChangeEvent<HTMLInputElement>) => setAddr({ ...addr, [k]: e.target.value });

  const pay = async (method: "UPI" | "Cash on Delivery") => {
    if (!quote) return;
    setBusy(true);
    const res = await startCheckout({
      data: {
        items: [{ productId: quote.productId, qty: quote.qty }],
        address: addr,
        shippingCode: "standard",
        paymentMethod: method,
        quoteToken: token,
      },
    });
    if ("error" in res) {
      setBusy(false);
      return toast.error(res.error);
    }
    if (!res.razorpay) {
      setBusy(false);
      toast.success(`Order ${res.humanId} placed`);
      return void navigate({ to: "/order/$id", params: { id: res.orderId }, search: { t: res.token } });
    }
    const result = await payWithRazorpay({
      keyId: res.razorpay.keyId,
      orderId: res.razorpay.orderId,
      amountPaise: res.razorpay.amountPaise,
      name: "Shaw Traders EV",
      description: `Order ${res.humanId}`,
      prefill: { name: addr.name, contact: addr.phone },
    });
    if (result.status === "success") {
      const check = await verifyPayment({
        data: {
          orderId: res.orderId,
          razorpayOrderId: result.payload.razorpay_order_id,
          paymentId: result.payload.razorpay_payment_id,
          signature: result.payload.razorpay_signature,
        },
      });
      setBusy(false);
      if (check.paid) {
        toast.success(`Payment received · order ${res.humanId}`);
        return void navigate({ to: "/order/$id", params: { id: res.orderId }, search: { t: res.token } });
      }
      return toast.error(check.error ?? "We could not confirm this payment yet.");
    }
    setBusy(false);
    toast.error(result.status === "dismissed" ? "Payment window closed." : result.message);
  };

  if (isPending) return <div className="container-page py-16"><div className="h-52 animate-pulse rounded-2xl bg-muted" /></div>;

  if (!quote) {
    return (
      <div className="container-page py-16 text-center">
        <h1 className="font-display text-2xl font-bold">This quote link is not valid</h1>
        <p className="mt-2 text-muted-foreground">Please ask us again on WhatsApp for a fresh price.</p>
        <Button asChild className="mt-4"><Link to="/">Go to the shop</Link></Button>
      </div>
    );
  }

  const total = quote.unitPrice * quote.qty;
  const closed = quote.spent || quote.expired;

  return (
    <div className="container-page max-w-xl py-10">
      <h1 className="font-display text-2xl font-bold">Your price quote</h1>

      <div className="mt-4 flex gap-4 rounded-2xl border border-border bg-card p-4">
        {quote.imageUrl && (
          <img src={quote.imageUrl} alt={quote.productName} width={96} height={96} className="size-24 rounded-xl object-cover" />
        )}
        <div>
          <p className="font-semibold leading-snug">{quote.productName}</p>
          <p className="text-sm text-muted-foreground">
            {quote.qty} × {formatINR(quote.unitPrice)}
          </p>
          <p className="mt-1 font-display text-xl font-bold">{formatINR(total)}</p>
          {quote.expiresAt && !closed && (
            <p className="text-xs text-muted-foreground">Valid till {new Date(quote.expiresAt).toLocaleDateString("en-IN")}</p>
          )}
        </div>
      </div>

      {closed ? (
        <p className="mt-4 rounded-2xl border border-dashed border-border bg-surface p-6 text-center text-sm">
          {quote.spent ? "This quote has already been used for an order." : "This quote has expired. Please ask us for a fresh price."}
        </p>
      ) : (
        <form
          className="mt-6 grid gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            void pay("UPI");
          }}
        >
          <h2 className="font-semibold">Where should we send it?</h2>
          <div className="grid gap-1.5"><Label htmlFor="q-name">Your name</Label><Input id="q-name" value={addr.name} onChange={set("name")} required /></div>
          <div className="grid gap-1.5"><Label htmlFor="q-phone">Mobile number</Label><Input id="q-phone" inputMode="numeric" value={addr.phone} onChange={set("phone")} required /></div>
          <div className="grid gap-1.5"><Label htmlFor="q-line1">Address</Label><Input id="q-line1" value={addr.line1} onChange={set("line1")} required /></div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="grid gap-1.5"><Label htmlFor="q-city">Town</Label><Input id="q-city" value={addr.city} onChange={set("city")} required /></div>
            <div className="grid gap-1.5"><Label htmlFor="q-state">State</Label><Input id="q-state" value={addr.state} onChange={set("state")} required /></div>
            <div className="grid gap-1.5"><Label htmlFor="q-pin">PIN code</Label><Input id="q-pin" inputMode="numeric" value={addr.pincode} onChange={set("pincode")} required /></div>
          </div>
          <Button type="submit" disabled={busy}>{busy ? "Please wait…" : `Pay ${formatINR(total)}`}</Button>
          <Button type="button" variant="outline" disabled={busy} onClick={() => void pay("Cash on Delivery")}>
            Pay cash on delivery
          </Button>
        </form>
      )}
    </div>
  );
}
