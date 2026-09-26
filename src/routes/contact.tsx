import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { MapPin, Navigation, Phone } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SectionHeading } from "@/components/site/Empty";
import { BUSINESS, breadcrumbLd, canonical, whatsappLink } from "@/lib/catalog";
import { useQuery } from "@tanstack/react-query";
import { shopSettingsQuery } from "@/lib/shop-settings";
import { createGeneralEnquiry } from "@/lib/enquiries.functions";

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
    scripts: [breadcrumbLd([{ name: "Contact", path: "/contact" }])],
  }),

  component: ContactPage,
});

const MAPS_QUERY = encodeURIComponent(BUSINESS.address);

function ContactPage() {
  const { data: settings } = useQuery(shopSettingsQuery());
  const [f, setF] = useState({ name: "", phone: "", alternatePhone: "", email: "", product: "", message: "" });
  const [sending, setSending] = useState(false);

  const send = async () => {
    const phone = f.phone.replace(/\D/g, "");
    const alternatePhone = f.alternatePhone.replace(/\D/g, "");
    if (!f.name.trim() || !/^[6-9]\d{9}$/.test(phone)) return toast.error("Please add your name and a valid 10-digit phone number");
    if (alternatePhone && !/^[6-9]\d{9}$/.test(alternatePhone)) return toast.error("Enter a valid 10-digit alternate mobile number.");
    setSending(true);
    const res = await createGeneralEnquiry({ data: { source: "contact", name: f.name, phone, alternatePhone, subject: f.product || "Contact enquiry", note: [f.email ? `Email: ${f.email}` : "", f.message].filter(Boolean).join(" — ") } });
    setSending(false);
    if (!res.ok) return toast.error(res.message);
    const text = [`Hello ${BUSINESS.name}`, `Name: ${f.name}`, `Phone: ${phone}`, alternatePhone ? `Alternate Number: ${alternatePhone}` : "", f.email ? `Email: ${f.email}` : "", f.product ? `Part needed: ${f.product}` : "", f.message].filter(Boolean).join("\n");
    window.open(whatsappLink(text), "_blank", "noreferrer");
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
            <div className="grid gap-3 sm:grid-cols-2">
              <Row label="Phone number" v={f.phone} on={(v) => setF({ ...f, phone: v })} numeric />
              <Row label="Alternate Number (optional)" v={f.alternatePhone} on={(v) => setF({ ...f, alternatePhone: v })} numeric />
            </div>
            <Row label="Email (optional)" v={f.email} on={(v) => setF({ ...f, email: v })} />
            <Row label="Part / product enquiry" v={f.product} on={(v) => setF({ ...f, product: v })} />
            <div className="grid gap-1.5">
              <Label className="text-xs">Message</Label>
              <Textarea rows={4} value={f.message} onChange={(e) => setF({ ...f, message: e.target.value })} />
            </div>
            <Button disabled={sending} onClick={() => void send()}>{sending ? "Saving…" : "Send on WhatsApp"}</Button>
            <p className="text-xs text-muted-foreground">Your enquiry opens in WhatsApp so we can reply quickly.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, v, on, numeric = false }: { label: string; v: string; on: (v: string) => void; numeric?: boolean }) {
  return (
    <div className="grid gap-1.5">
      <Label className="text-xs">{label}</Label>
      <Input inputMode={numeric ? "numeric" : undefined} maxLength={numeric ? 10 : undefined} value={v} onChange={(e) => on(numeric ? e.target.value.replace(/\D/g, "").slice(0, 10) : e.target.value)} />
    </div>
  );
}
