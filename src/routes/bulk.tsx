import { createFileRoute } from "@tanstack/react-router";
import { cloneElement, useRef, useState, type ReactElement } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { SparkRing } from "@/components/site/SparkLoaders";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { VOLUME_OPTIONS } from "@/lib/trade-options";
import { BUSINESS, breadcrumbLd, canonical, whatsappLink } from "@/lib/catalog";
import { createGeneralEnquiry } from "@/lib/enquiries.functions";
import { errorCount, focusFirstInvalid, validateNameAndPhones, validationSummary, type FieldErrors } from "@/lib/form-validation";

export const Route = createFileRoute("/bulk")({
  head: () => ({
    meta: [
      { title: "Dealer & Bulk Orders" },
      { name: "description", content: "Bulk enquiry for e-rickshaw and EV workshops, dealers and fleet owners. Share your requirement and our Bud Bud team will quote." },
      { property: "og:title", content: "Bulk & Dealer Orders — Shaw Traders EV" },
      { property: "og:description", content: "Wholesale EV spare parts enquiries for workshops, dealers and fleets." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: canonical("/bulk") },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: canonical("/bulk") }],
    scripts: [breadcrumbLd([{ name: "Dealer & Bulk Orders", path: "/bulk" }])],
  }),

  component: BulkPage,
});

function BulkPage() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [alternatePhone, setAlternatePhone] = useState("");
  const [business, setBusiness] = useState("");
  const [requirement, setRequirement] = useState("");
  const [volume, setVolume] = useState("");
  const [sending, setSending] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);
  const errors: FieldErrors<"name" | "phone" | "alternatePhone" | "requirement"> = submitted
    ? { ...validateNameAndPhones({ name, phone, alternatePhone }), ...(!requirement.trim() ? { requirement: "Tell us what parts you need." } : {}) }
    : {};

  const message = `Bulk enquiry — Shaw Traders EV
Name: ${name}
Phone: ${phone}
${alternatePhone ? `Alternate Number: ${alternatePhone}\n` : ""}Business: ${business}
Monthly purchase estimate: ${volume || "-"}
Requirement: ${requirement}`;

  const send = async () => {
    const cleanPhone = phone.replace(/\D/g, "");
    const cleanAlternate = alternatePhone.replace(/\D/g, "");
    setSubmitted(true);
    const validationErrors = { ...validateNameAndPhones({ name, phone, alternatePhone }), ...(!requirement.trim() ? { requirement: "Tell us what parts you need." } : {}) };
    if (errorCount(validationErrors) > 0) {
      toast.error(validationSummary(validationErrors));
      focusFirstInvalid(formRef.current);
      return;
    }
    setSending(true);
    const res = await createGeneralEnquiry({ data: { source: "bulk", name, phone: cleanPhone, alternatePhone: cleanAlternate, subject: business || "Bulk & dealer enquiry", note: `Monthly purchase estimate: ${volume || "-"} — ${requirement}` } });
    setSending(false);
    if (!res.ok) return toast.error(res.message);
    window.open(whatsappLink(message), "_blank", "noreferrer");
  };

  return (
    <div className="container mx-auto max-w-2xl space-y-6 px-4 py-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold md:text-3xl">Bulk & Dealer Orders</h1>
        <p className="text-sm text-muted-foreground">
          For workshops, e-rickshaw fleets and dealers. Share your part list and quantity — we will confirm pricing and availability from {BUSINESS.address}.
        </p>
      </header>

      <div ref={formRef} className="space-y-3 rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
        <FieldError message={errors.name}><Input placeholder="Your name" aria-label="Your name" value={name} onChange={(e) => setName(e.target.value)} /></FieldError>
        <div className="grid gap-3 sm:grid-cols-2">
          <FieldError message={errors.phone}><Input placeholder="Mobile number" aria-label="Mobile number" inputMode="numeric" maxLength={10} value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))} /></FieldError>
          <FieldError message={errors.alternatePhone}><Input placeholder="Alternate Number (optional)" aria-label="Alternate Number (optional)" inputMode="numeric" maxLength={10} value={alternatePhone} onChange={(e) => setAlternatePhone(e.target.value.replace(/\D/g, "").slice(0, 10))} /></FieldError>
        </div>
        <Input placeholder="Business / workshop name" value={business} onChange={(e) => setBusiness(e.target.value)} />
        <Select value={volume || undefined} onValueChange={setVolume}>
          <SelectTrigger className="min-h-10" aria-label="Monthly purchase estimate"><SelectValue placeholder="Monthly purchase estimate" /></SelectTrigger>
          <SelectContent>
            {VOLUME_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
          </SelectContent>
        </Select>
        <FieldError message={errors.requirement}><Textarea rows={5} aria-label="Parts needed and quantity" placeholder="Parts needed and quantity (e.g. 20 x 60V charger, 10 x rear shocker)" value={requirement} onChange={(e) => setRequirement(e.target.value)} /></FieldError>
        <div className="flex flex-wrap gap-3 pt-1">
          <Button disabled={sending} onClick={() => void send()}>{sending ? <SparkRing /> : null}{sending ? "Saving…" : "Send enquiry on WhatsApp"}</Button>
          <Button asChild variant="outline">
            <a href={`tel:${BUSINESS.phone}`}>Call {BUSINESS.phone}</a>
          </Button>
        </div>
      </div>
    </div>
  );
}

function FieldError({ message, children }: { message?: string; children: ReactElement<{ "aria-label"?: string; "aria-invalid"?: boolean; "aria-describedby"?: string }> }) {
  const id = `bulk-${children.props["aria-label"]?.toLowerCase().replace(/[^a-z]+/g, "-") ?? "field"}-error`;
  return <div className="grid gap-1.5">{cloneElement(children, { "aria-invalid": message ? true : undefined, "aria-describedby": message ? id : undefined })}{message && <p id={id} role="alert" className="text-xs text-destructive">{message}</p>}</div>;
}
