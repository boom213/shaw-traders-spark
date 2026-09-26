import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SectionHeading } from "@/components/site/Empty";
import { BUSINESS, breadcrumbLd, canonical, formatINR } from "@/lib/catalog";
import { requestService, serviceHistory, type ServiceHistoryView } from "@/lib/vehicles.functions";
import { TEST_RIDE_SLOTS } from "@/lib/vehicles";

export const Route = createFileRoute("/service")({
  head: () => ({
    meta: [
      { title: "Scooter Service & History" },
      { name: "description", content: "Book a service slot for your electric scooter at Shaw Traders EV and see your past services, warranty start and what is due next." },
      { property: "og:title", content: "Scooter Service & History — Shaw Traders EV" },
      { property: "og:description", content: "Book a service slot and look up your scooter's service history." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: canonical("/service") },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: canonical("/service") }],
    scripts: [
      breadcrumbLd([
        { name: "Electric Scooters", path: "/scooters" },
        { name: "Scooter Service", path: "/service" },
      ]),
    ],
  }),

  component: ServicePage,
});

function ServicePage() {
  const [book, setBook] = useState({ name: "", phone: "", alternatePhone: "", date: "", slot: TEST_RIDE_SLOTS[0]!, issue: "", registrationNumber: "" });
  const [bookMsg, setBookMsg] = useState<string | null>(null);
  const [look, setLook] = useState({ phone: "", reference: "" });
  const [history, setHistory] = useState<ServiceHistoryView | null>(null);
  const [lookMsg, setLookMsg] = useState<string | null>(null);

  return (
    <div className="container-page py-8">
      <SectionHeading
        as="h1"
        title="Scooter Service"
        subtitle={`Book a slot at our Bud Bud workshop, or look up what your scooter has already had done. Call ${BUSINESS.phone} if you are stuck.`}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="grid gap-3 rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
          <h2 className="font-display text-lg font-bold">Book a service slot</h2>
          <Input placeholder="Your name" aria-label="Your name" value={book.name} onChange={(e) => setBook({ ...book, name: e.target.value })} />
          <div className="grid gap-3 sm:grid-cols-2">
            <Input placeholder="Mobile number" aria-label="Mobile number" inputMode="numeric" maxLength={10} value={book.phone} onChange={(e) => setBook({ ...book, phone: e.target.value.replace(/\D/g, "").slice(0, 10) })} />
            <Input placeholder="Alternate Number (optional)" aria-label="Alternate Number (optional)" inputMode="numeric" maxLength={10} value={book.alternatePhone} onChange={(e) => setBook({ ...book, alternatePhone: e.target.value.replace(/\D/g, "").slice(0, 10) })} />
          </div>
          <Input placeholder="Registration number (if you have one)" aria-label="Registration number" value={book.registrationNumber} onChange={(e) => setBook({ ...book, registrationNumber: e.target.value })} />
          <Input type="date" aria-label="Preferred date" value={book.date} onChange={(e) => setBook({ ...book, date: e.target.value })} />
          <Select value={book.slot} onValueChange={(v) => setBook({ ...book, slot: v })}>
            <SelectTrigger aria-label="Time slot"><SelectValue /></SelectTrigger>
            <SelectContent>{TEST_RIDE_SLOTS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
          </Select>
          <Textarea rows={3} placeholder="What is the problem?" aria-label="What is the problem" value={book.issue} onChange={(e) => setBook({ ...book, issue: e.target.value })} />
          <Button
            onClick={async () => {
              if (book.alternatePhone && !/^[6-9]\d{9}$/.test(book.alternatePhone)) {
                setBookMsg("Enter a valid 10-digit alternate mobile number.");
                return;
              }
              const r = await requestService({ data: book });
              setBookMsg(r.ok ? "Slot requested. We will confirm on WhatsApp." : (r.error ?? "Please try again."));
            }}
          >
            Request this slot
          </Button>
          {bookMsg && <p className="text-sm font-medium text-primary">{bookMsg}</p>}
        </section>

        <section className="grid gap-3 rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
          <h2 className="font-display text-lg font-bold">Your service history</h2>
          <p className="text-sm text-muted-foreground">Enter the mobile number used at the shop and your registration or chassis number.</p>
          <Input placeholder="Mobile number" aria-label="Mobile number for lookup" inputMode="numeric" value={look.phone} onChange={(e) => setLook({ ...look, phone: e.target.value })} />
          <Input placeholder="Registration or chassis number" aria-label="Registration or chassis number" value={look.reference} onChange={(e) => setLook({ ...look, reference: e.target.value })} />
          <Button
            variant="outline"
            onClick={async () => {
              setHistory(null);
              setLookMsg(null);
              const r = await serviceHistory({ data: look });
              if ("error" in r) setLookMsg(r.error);
              else setHistory(r);
            }}
          >
            Show my history
          </Button>
          {lookMsg && <p className="text-sm font-medium text-destructive">{lookMsg}</p>}

          {history && (
            <div className="grid gap-4 text-sm">
              <div>
                <p className="font-semibold">{history.model}</p>
                <p className="text-muted-foreground">
                  {history.registrationNumber ?? history.chassisNumber ?? ""}
                  {history.warrantyStart ? ` · warranty from ${new Date(history.warrantyStart).toLocaleDateString("en-IN")}` : ""}
                </p>
              </div>
              {history.upcoming.length > 0 && (
                <div>
                  <p className="mb-1 font-semibold">Coming up</p>
                  <ul className="grid gap-1 text-muted-foreground">
                    {history.upcoming.map((u, i) => (
                      <li key={i}>
                        {u.label} — due {new Date(u.dueOn).toLocaleDateString("en-IN")}
                        {u.dueKm ? ` or ${u.dueKm.toLocaleString("en-IN")} km` : ""}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div>
                <p className="mb-1 font-semibold">Work done so far</p>
                {history.history.length === 0 ? (
                  <p className="text-muted-foreground">Nothing recorded yet.</p>
                ) : (
                  <ul className="grid gap-2">
                    {history.history.map((h, i) => (
                      <li key={i} className="rounded-xl border border-border bg-surface px-3 py-2">
                        <p className="font-medium">{new Date(h.performedOn).toLocaleDateString("en-IN")} — {h.workDone}</p>
                        <p className="text-xs text-muted-foreground">
                          {h.odometer ? `${h.odometer.toLocaleString("en-IN")} km` : ""}
                          {h.cost !== null ? ` · ${formatINR(h.cost)}` : ""}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
