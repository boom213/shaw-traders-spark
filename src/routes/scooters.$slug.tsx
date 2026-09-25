import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { SectionHeading } from "@/components/site/Empty";
import { BUSINESS, canonical, formatINR, whatsappLink } from "@/lib/catalog";
import { getVehicle, requestFinance, requestTestRide } from "@/lib/vehicles.functions";
import { startBooking, verifyBookingPayment } from "@/lib/booking.functions";
import { payWithRazorpay } from "@/lib/razorpay-client";
import { SPEC_ROWS, TEST_RIDE_SLOTS, emi, priceLines } from "@/lib/vehicles";

export const Route = createFileRoute("/scooters/$slug")({
  loader: async ({ params }) => {
    const found = await getVehicle({ data: { slug: params.slug } });
    if (!found) throw notFound();
    return found;
  },
  head: ({ params, loaderData }) => {
    const v = loaderData?.vehicle;
    const url = canonical(`/scooters/${params.slug}`);
    const title = v ? `${v.name} — Price, Range & Booking` : "Electric Scooter";
    const description = v
      ? `${v.name}${v.specs.certifiedRange ? ` with ${v.specs.certifiedRange} certified range` : ""}${
          v.price.onRoad > 0 ? ` at ${formatINR(v.price.onRoad)} on-road` : ""
        }. Full specifications, itemised price, finance and test ride at Shaw Traders EV.`
      : "Electric scooter details at Shaw Traders EV.";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "product" },
        { property: "og:url", content: url },
        { name: "twitter:card", content: "summary_large_image" },
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: v
        ? [
            {
              type: "application/ld+json",
              children: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "Product",
                name: v.name,
                brand: v.brand ?? BUSINESS.name,
                description: v.description ?? description,
                ...(v.price.onRoad > 0
                  ? { offers: { "@type": "Offer", price: v.price.onRoad, priceCurrency: "INR", availability: "https://schema.org/InStock", url } }
                  : {}),
              }),
            },
            {
              type: "application/ld+json",
              children: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "BreadcrumbList",
                itemListElement: [
                  { "@type": "ListItem", position: 1, name: "Home", item: canonical("/") },
                  { "@type": "ListItem", position: 2, name: "Electric Scooters", item: canonical("/scooters") },
                  { "@type": "ListItem", position: 3, name: v.name, item: url },
                ],
              }),
            },
          ]
        : [],
    };
  },
  component: ScooterPage,
});

function Note({ text }: { text: string | null }) {
  if (!text) return null;
  return <p className="mt-2 text-sm font-medium text-primary">{text}</p>;
}

function localDateInputValue(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function BookingForm({ slug, colours, tokenAmount, modelName }: { slug: string; colours: string[]; tokenAmount: number; modelName: string }) {
  const [form, setForm] = useState({ name: "", phone: "", email: "", address: "", colour: colours[0] ?? "" });
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [link, setLink] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setNote(null);
    const res = await startBooking({ data: { slug, ...form } });
    if ("error" in res) {
      setNote(res.error);
      setBusy(false);
      return;
    }
    if (res.razorpay) {
      const pay = await payWithRazorpay({
        keyId: res.razorpay.keyId,
        orderId: res.razorpay.orderId,
        amountPaise: res.razorpay.amountPaise,
        name: BUSINESS.name,
        description: `Token for ${modelName}`,
        prefill: { name: form.name, contact: form.phone, ...(form.email ? { email: form.email } : {}) },
      });
      if (pay.status === "success") {
        await verifyBookingPayment({
          data: {
            bookingId: res.bookingId,
            razorpayOrderId: pay.payload.razorpay_order_id,
            paymentId: pay.payload.razorpay_payment_id,
            signature: pay.payload.razorpay_signature,
          },
        });
        setNote(`Booking ${res.humanId} confirmed. We will call you about allotment.`);
      } else {
        setNote(`Booking ${res.humanId} is held. The token was not paid yet — you can pay at the shop.`);
      }
    } else {
      setNote(`Booking ${res.humanId} placed. Pay the token of ${formatINR(res.tokenAmount)} at the shop to confirm.`);
    }
    setLink(`/booking/${res.token}`);
    setBusy(false);
  };

  return (
    <div className="grid gap-3">
      <DialogTitle className="font-display text-lg font-bold">Book this scooter</DialogTitle>
      <p className="text-sm text-muted-foreground">
        Pay a token of {formatINR(tokenAmount)} now. The balance is paid at delivery.
      </p>
      <div className="grid gap-2">
        <Label htmlFor="bk-name">Your name</Label>
        <Input id="bk-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="bk-phone">Mobile number</Label>
        <Input id="bk-phone" inputMode="numeric" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="bk-email">Email (for the receipt, optional)</Label>
        <Input id="bk-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
      </div>
      {colours.length > 0 && (
        <div className="grid gap-2">
          <Label>Colour</Label>
          <Select value={form.colour} onValueChange={(v) => setForm({ ...form, colour: v })}>
            <SelectTrigger><SelectValue placeholder="Pick a colour" /></SelectTrigger>
            <SelectContent>
              {colours.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}
      <div className="grid gap-2">
        <Label htmlFor="bk-addr">Address (optional)</Label>
        <Textarea id="bk-addr" rows={2} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
      </div>
      <Button onClick={submit} disabled={busy}>{busy ? "Please wait…" : `Pay ${formatINR(tokenAmount)} token`}</Button>
      <Note text={note} />
      {link && (
        <Button variant="outline" asChild>
          <a href={link}>Follow your booking</a>
        </Button>
      )}
    </div>
  );
}

function TestRideForm({ slug }: { slug: string }) {
  const [f, setF] = useState({ name: "", phone: "", date: "", slot: TEST_RIDE_SLOTS[0]!, note: "" });
  const [msg, setMsg] = useState<string | null>(null);
  const [minimumDate, setMinimumDate] = useState("");
  useEffect(() => setMinimumDate(localDateInputValue()), []);
  return (
    <div className="grid gap-3 rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
      <h3 className="font-display text-lg font-bold">Book a test ride</h3>
      <Input placeholder="Your name" aria-label="Your name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
      <Input placeholder="Mobile number" aria-label="Mobile number" inputMode="numeric" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
      <Input
        type="date"
        aria-label="Preferred date"
        min={minimumDate || undefined}
        value={f.date}
        onChange={(e) => setF({ ...f, date: e.target.value })}
      />
      <Select value={f.slot} onValueChange={(v) => setF({ ...f, slot: v })}>
        <SelectTrigger aria-label="Time slot"><SelectValue /></SelectTrigger>
        <SelectContent>{TEST_RIDE_SLOTS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
      </Select>
      <Button
        onClick={async () => {
          const r = await requestTestRide({ data: { slug, ...f } });
          setMsg(r.ok ? "Thank you — we will confirm your slot on WhatsApp." : (r.error ?? "Please try again."));
        }}
      >
        Request a test ride
      </Button>
      <Note text={msg} />
    </div>
  );
}

function FinanceForm({ slug, onRoad }: { slug: string; onRoad: number }) {
  const [f, setF] = useState({ name: "", phone: "", downPayment: "", tenureMonths: "24", monthlyIncome: "", employment: "" });
  const [msg, setMsg] = useState<string | null>(null);
  const principal = Math.max(0, onRoad - (Number(f.downPayment) || 0));
  const monthly = emi(principal, 12, Number(f.tenureMonths) || 24);
  return (
    <div className="grid gap-3 rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
      <h3 className="font-display text-lg font-bold">Finance</h3>
      <p className="text-sm text-muted-foreground">
        Roughly {formatINR(monthly)} a month over {f.tenureMonths} months at about 12% a year, after {formatINR(Number(f.downPayment) || 0)} down.
        The lender decides the final rate.
      </p>
      <Input placeholder="Your name" aria-label="Your name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
      <Input placeholder="Mobile number" aria-label="Mobile number" inputMode="numeric" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
      <Input placeholder="Down payment (₹)" aria-label="Down payment" inputMode="numeric" value={f.downPayment} onChange={(e) => setF({ ...f, downPayment: e.target.value })} />
      <Select value={f.tenureMonths} onValueChange={(v) => setF({ ...f, tenureMonths: v })}>
        <SelectTrigger aria-label="Tenure"><SelectValue /></SelectTrigger>
        <SelectContent>{["12", "18", "24", "36", "48"].map((m) => <SelectItem key={m} value={m}>{m} months</SelectItem>)}</SelectContent>
      </Select>
      <Input placeholder="Monthly income (₹)" aria-label="Monthly income" inputMode="numeric" value={f.monthlyIncome} onChange={(e) => setF({ ...f, monthlyIncome: e.target.value })} />
      <Button
        variant="outline"
        onClick={async () => {
          const r = await requestFinance({
            data: {
              slug,
              name: f.name,
              phone: f.phone,
              downPayment: Number(f.downPayment) || 0,
              tenureMonths: Number(f.tenureMonths) || 24,
              monthlyIncome: Number(f.monthlyIncome) || 0,
              employment: f.employment,
            },
          });
          setMsg(r.ok ? "Sent. Our finance desk will call you." : (r.error ?? "Please try again."));
        }}
      >
        Ask about finance
      </Button>
      <Note text={msg} />
    </div>
  );
}

function ExchangeForm() {
  return (
    <div className="grid gap-3 rounded-2xl border border-border bg-muted/40 p-5 opacity-70 shadow-[var(--shadow-card)]" aria-disabled="true">
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-display text-lg font-bold">Exchange your old scooter</h3>
        <span className="shrink-0 rounded-full border border-border bg-background px-2 py-1 text-[11px] font-semibold text-muted-foreground">
          Unavailable
        </span>
      </div>
      <Input disabled placeholder="Your name" aria-label="Your name" />
      <Input disabled placeholder="Mobile number" aria-label="Mobile number" inputMode="numeric" />
      <div className="grid grid-cols-2 gap-3">
        <Input disabled placeholder="Make" aria-label="Current make" />
        <Input disabled placeholder="Model" aria-label="Current model" />
        <Input disabled placeholder="Year" aria-label="Year" inputMode="numeric" />
        <Input disabled placeholder="Km run" aria-label="Kilometres run" inputMode="numeric" />
      </div>
      <Select disabled value="Good">
        <SelectTrigger aria-label="Condition"><SelectValue /></SelectTrigger>
        <SelectContent><SelectItem value="Good">Good</SelectItem></SelectContent>
      </Select>
      <div className="group relative" tabIndex={0} aria-label="Exchange valuation not available">
        <Button disabled variant="outline" className="w-full pointer-events-none">Get a valuation</Button>
        <span
          role="tooltip"
          className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 rounded-md bg-primary px-3 py-1.5 text-xs text-primary-foreground opacity-0 shadow-sm transition-opacity group-hover:opacity-100 group-focus:opacity-100"
        >
          Not available
        </span>
      </div>
    </div>
  );
}

function ScooterPage() {
  const { vehicle, others } = Route.useLoaderData();
  const [active, setActive] = useState(0);
  const lines = priceLines(vehicle.price, vehicle.specs.registrationRequired);
  const specRows = SPEC_ROWS.filter((r) => Boolean(vehicle.specs[r.key]));

  return (
    <div className="container-page py-8">
      <nav aria-label="Breadcrumb" className="mb-5 text-xs text-muted-foreground">
        <Link to="/" className="hover:text-foreground">Home</Link> /{" "}
        <Link to="/scooters" className="hover:text-foreground">Electric Scooters</Link> /{" "}
        <span className="text-foreground">{vehicle.name}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-2">
        <div>
          <div className="aspect-4/3 w-full overflow-hidden rounded-2xl border border-border bg-surface">
            {vehicle.images[active] ? (
              <img src={vehicle.images[active]} alt={vehicle.name} width={960} height={720} className="size-full object-cover" />
            ) : (
              <div className="grid size-full place-items-center text-sm text-muted-foreground">Photo coming soon</div>
            )}
          </div>
          {vehicle.images.length > 1 && (
            <div className="mt-3 flex gap-2 overflow-x-auto" role="group" aria-label="Photo gallery">
              {vehicle.images.map((img, i) => (
                <button
                  key={img}
                  onClick={() => setActive(i)}
                  aria-label={`Photo ${i + 1} of ${vehicle.name}`}
                  aria-current={i === active}
                  className={`size-16 shrink-0 overflow-hidden rounded-lg border ${i === active ? "border-primary" : "border-border"}`}
                >
                  <img src={img} alt="" width={64} height={64} loading="lazy" className="size-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          {vehicle.brand && <p className="text-xs uppercase tracking-wide text-muted-foreground">{vehicle.brand}</p>}
          <h1 className="font-display text-3xl font-bold tracking-tight">{vehicle.name}</h1>
          {vehicle.extraSpecs?.['demo'] === "true" && (
            <p className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-900">Sample data — not a real model</p>
          )}
          {vehicle.specs.variant && <p className="mt-1 text-sm text-muted-foreground">{vehicle.specs.variant}</p>}
          {vehicle.description && <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{vehicle.description}</p>}

          <div className="mt-6 rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
            <h2 className="mb-3 font-display text-base font-bold">What you actually pay</h2>
            {vehicle.price.onRoad > 0 ? (
              <>
                <dl className="grid gap-2 text-sm">
                  {lines.map((l) => (
                    <div key={l.label} className="flex justify-between">
                      <dt className="text-muted-foreground">{l.label}</dt>
                      <dd>{l.negative ? `− ${formatINR(l.amount)}` : formatINR(l.amount)}</dd>
                    </div>
                  ))}
                  <div className="flex justify-between border-t border-border pt-2">
                    <dt className="font-semibold">On-road price</dt>
                    <dd className="font-display text-xl font-bold">{formatINR(vehicle.price.onRoad)}</dd>
                  </div>
                </dl>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button className="mt-4 w-full">Book with {formatINR(Math.min(vehicle.price.tokenAmount, vehicle.price.onRoad))} token</Button>
                  </DialogTrigger>
                  <DialogContent className="max-h-[85vh] overflow-y-auto">
                    <BookingForm
                      slug={vehicle.slug}
                      colours={vehicle.specs.colours}
                      modelName={vehicle.name}
                      tokenAmount={Math.min(vehicle.price.tokenAmount, vehicle.price.onRoad)}
                    />
                  </DialogContent>
                </Dialog>
              </>
            ) : (
              <div>
                <p className="text-sm text-muted-foreground">The price for this model is not published yet.</p>
                <Button className="mt-4" asChild>
                  <a href={whatsappLink(`Hello ${BUSINESS.name}, what is the on-road price of the ${vehicle.name}?`)} target="_blank" rel="noreferrer">
                    Ask the on-road price
                  </a>
                </Button>
              </div>
            )}
          </div>

          {vehicle.specs.colours.length > 0 && (
            <p className="mt-4 text-sm text-muted-foreground">Colours: {vehicle.specs.colours.join(", ")}</p>
          )}
        </div>
      </div>

      <section className="mt-12" aria-label="Specifications">
        <SectionHeading title="Specifications" />
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-card)]">
          <table className="w-full text-sm">
            <tbody>
              {specRows.map((r) => (
                <tr key={r.key} className="border-b border-border last:border-0">
                  <th scope="row" className="w-1/2 p-3 text-left font-medium text-muted-foreground">{r.label}</th>
                  <td className="p-3">{String(vehicle.specs[r.key])}</td>
                </tr>
              ))}
              {(vehicle.specs.warrantyYears || vehicle.specs.warrantyKm) && (
                <tr className="border-b border-border last:border-0">
                  <th scope="row" className="p-3 text-left font-medium text-muted-foreground">Warranty</th>
                  <td className="p-3">
                    {vehicle.specs.warrantyYears ? `${vehicle.specs.warrantyYears} years` : ""}
                    {vehicle.specs.warrantyKm ? `${vehicle.specs.warrantyYears ? " / " : ""}${vehicle.specs.warrantyKm.toLocaleString("en-IN")} km` : ""}
                  </td>
                </tr>
              )}
              <tr>
                <th scope="row" className="p-3 text-left font-medium text-muted-foreground">Registration</th>
                <td className="p-3">{vehicle.specs.registrationRequired ? "RTO registration required — we handle it" : "No registration needed"}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-12 grid gap-4 md:grid-cols-3" aria-label="Test ride, finance and exchange">
        <TestRideForm slug={vehicle.slug} />
        <FinanceForm slug={vehicle.slug} onRoad={vehicle.price.onRoad} />
        <ExchangeForm />
      </section>

      {others.length > 0 && (
        <section className="mt-12" aria-label="Other models">
          <SectionHeading title="Other models" subtitle="Compare two or three before you decide." />
          <div className="flex flex-wrap gap-3">
            {others.map((o) => (
              <Link
                key={o.id}
                to="/scooters/$slug"
                params={{ slug: o.slug }}
                className="rounded-full border border-border bg-card px-4 py-2 text-sm font-medium hover:border-primary"
              >
                {o.name}
                {o.price.onRoad > 0 ? ` — ${formatINR(o.price.onRoad)}` : ""}
              </Link>
            ))}
          </div>
        </section>
      )}

      <nav aria-label="Keep browsing" className="mt-12 flex flex-wrap gap-3 border-t border-border pt-6 text-sm">
        <Link to="/scooters" className="rounded-full border border-border bg-card px-4 py-2 font-medium hover:border-primary">All electric scooters</Link>
        <Link to="/service" className="rounded-full border border-border bg-card px-4 py-2 font-medium hover:border-primary">Service & history</Link>
        <Link to="/shop" className="rounded-full border border-border bg-card px-4 py-2 font-medium hover:border-primary">Shop EV Spare Parts</Link>
      </nav>
    </div>
  );
}
