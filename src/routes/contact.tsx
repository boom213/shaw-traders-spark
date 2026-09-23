import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { MapPin, Navigation, Phone } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SectionHeading } from "@/components/site/Empty";
import { BUSINESS, canonical, whatsappLink } from "@/lib/catalog";
import { useQuery } from "@tanstack/react-query";
import { shopSettingsQuery } from "@/lib/shop-settings";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact Shaw Traders EV — Bud Bud, Bardhaman" },
      { name: "description", content: "Call, WhatsApp or visit Shaw Traders EV at Defence Colony, Bud Bud, Bardhaman, West Bengal 713403 for EV spare parts, batteries and chargers." },
      { property: "og:title", content: "Contact Shaw Traders EV" },
      { property: "og:description", content: "Phone 7501849610 — EV spare parts counter in Bud Bud, Bardhaman." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { property: "og:url", content: canonical("/contact") },
    ],
    links: [{ rel: "canonical", href: canonical("/contact") }],
  }),
  component: ContactPage,
});

const MAPS_QUERY = encodeURIComponent(BUSINESS.address);

function ContactPage() {
  const { data: settings } = useQuery(shopSettingsQuery());
  const [f, setF] = useState({ name: "", phone: "", email: "", product: "", message: "" });

  const send = () => {
    if (!f.name.trim() || !f.phone.trim()) return toast.error("Please add your name and phone number");
    const text = `Hello ${BUSINESS.name},%0AName: ${f.name}%0APhone: ${f.phone}${f.email ? `%0AEmail: ${f.email}` : ""}${f.product ? `%0APart needed: ${f.product}` : ""}${f.message ? `%0A${f.message}` : ""}`;
    window.open(`https://wa.me/${BUSINESS.phoneIntl}?text=${text}`, "_blank", "noreferrer");
  };

  return (
    <div className="container-page py-10">
      <SectionHeading as="h1" title="Contact us" subtitle="Call, message on WhatsApp or visit our counter in Bud Bud." />

      <div className="grid gap-8 lg:grid-cols-[1fr_1fr]">
        <div>
          <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
            <h3 className="font-display text-base font-bold">{BUSINESS.name}</h3>
            <p className="mt-2 flex gap-2 text-sm text-muted-foreground">
              <MapPin className="mt-0.5 size-4 shrink-0 text-primary" /> {BUSINESS.address}
            </p>
            <p className="mt-2 flex gap-2 text-sm text-muted-foreground">
              <Phone className="mt-0.5 size-4 shrink-0 text-primary" /> {BUSINESS.phone}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button asChild><a href={`tel:${BUSINESS.phone}`}>Call now</a></Button>
              <Button variant="outline" asChild>
                <a href={whatsappLink(`Hello ${BUSINESS.name}, I have a question about EV parts.`)} target="_blank" rel="noreferrer">WhatsApp</a>
              </Button>
              <Button variant="ghost" asChild>
                <a href={`https://www.google.com/maps/dir/?api=1&destination=${MAPS_QUERY}`} target="_blank" rel="noreferrer">
                  <Navigation className="size-4" /> Get directions
                </a>
              </Button>
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
            <h3 className="font-display text-base font-bold">Business & grievance details</h3>
            <dl className="mt-3 grid gap-1.5 text-sm text-muted-foreground">
              <div>
                <dt className="inline font-medium text-foreground">Registered business name: </dt>
                <dd className="inline">{settings?.legalName || BUSINESS.name}</dd>
              </div>
              <div>
                <dt className="inline font-medium text-foreground">Registered address: </dt>
                <dd className="inline">{settings?.billingAddress || BUSINESS.address}</dd>
              </div>
              <div>
                <dt className="inline font-medium text-foreground">Phone: </dt>
                <dd className="inline">{BUSINESS.phone}</dd>
              </div>
              {settings?.supportEmail && (
                <div>
                  <dt className="inline font-medium text-foreground">Email: </dt>
                  <dd className="inline">{settings.supportEmail}</dd>
                </div>
              )}
              {settings?.gstin && (
                <div>
                  <dt className="inline font-medium text-foreground">GSTIN: </dt>
                  <dd className="inline">{settings.gstin}</dd>
                </div>
              )}
            </dl>
            <div className="mt-4 border-t border-border pt-3 text-sm text-muted-foreground">
              <p className="font-medium text-foreground">Grievance officer</p>
              {settings?.grievanceName ? (
                <p className="mt-1">
                  {settings.grievanceName}
                  {settings.grievanceEmail ? ` · ${settings.grievanceEmail}` : ""}
                  {settings.grievancePhone ? ` · ${settings.grievancePhone}` : ""}
                </p>
              ) : (
                <p className="mt-1">Call or WhatsApp {BUSINESS.phone} and ask for the grievance officer.</p>
              )}
              <p className="mt-2 text-xs">
                Every complaint is acknowledged within 48 hours and settled within 30 days, as required by the
                Consumer Protection (E-Commerce) Rules, 2020.
              </p>
            </div>
          </div>

          <div className="mt-4 overflow-hidden rounded-2xl border border-border shadow-[var(--shadow-card)]">
            <iframe
              title="Shaw Traders EV location map"
              src={`https://www.google.com/maps?q=${MAPS_QUERY}&output=embed`}
              className="h-72 w-full border-0"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </div>

        <div className="h-fit rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
          <h3 className="font-display text-base font-bold">Send an enquiry</h3>
          <div className="mt-4 grid gap-3">
            <Row label="Your name" v={f.name} on={(v) => setF({ ...f, name: v })} />
            <Row label="Phone number" v={f.phone} on={(v) => setF({ ...f, phone: v })} />
            <Row label="Email (optional)" v={f.email} on={(v) => setF({ ...f, email: v })} />
            <Row label="Part / product enquiry" v={f.product} on={(v) => setF({ ...f, product: v })} />
            <div className="grid gap-1.5">
              <Label className="text-xs">Message</Label>
              <Textarea rows={4} value={f.message} onChange={(e) => setF({ ...f, message: e.target.value })} />
            </div>
            <Button onClick={send}>Send on WhatsApp</Button>
            <p className="text-xs text-muted-foreground">Your enquiry opens in WhatsApp so we can reply quickly.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, v, on }: { label: string; v: string; on: (v: string) => void }) {
  return (
    <div className="grid gap-1.5">
      <Label className="text-xs">{label}</Label>
      <Input value={v} onChange={(e) => on(e.target.value)} />
    </div>
  );
}
