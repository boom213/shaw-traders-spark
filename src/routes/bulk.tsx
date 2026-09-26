import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { VOLUME_OPTIONS } from "@/lib/trade-options";
import { BUSINESS, breadcrumbLd, canonical, whatsappLink } from "@/lib/catalog";
import { createGeneralEnquiry } from "@/lib/enquiries.functions";

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

  const message = `Bulk enquiry — Shaw Traders EV
Name: ${name}
Phone: ${phone}
${alternatePhone ? `Alternate Number: ${alternatePhone}\n` : ""}Business: ${business}
Monthly purchase estimate: ${volume || "-"}
Requirement: ${requirement}`;

  const send = async () => {
    const cleanPhone = phone.replace(/\D/g, "");
    const cleanAlternate = alternatePhone.replace(/\D/g, "");
    if (!name.trim() || !/^[6-9]\d{9}$/.test(cleanPhone)) return toast.error("Please add your name and a valid 10-digit phone number");
    if (cleanAlternate && !/^[6-9]\d{9}$/.test(cleanAlternate)) return toast.error("Enter a valid 10-digit alternate mobile number.");
    if (!requirement.trim()) return toast.error("Please tell us what parts you need.");
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

      <div className="space-y-3 rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
        <Input placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} />
        <div className="grid gap-3 sm:grid-cols-2">
          <Input placeholder="Mobile number" aria-label="Mobile number" inputMode="numeric" maxLength={10} value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))} />
          <Input placeholder="Alternate Number (optional)" aria-label="Alternate Number (optional)" inputMode="numeric" maxLength={10} value={alternatePhone} onChange={(e) => setAlternatePhone(e.target.value.replace(/\D/g, "").slice(0, 10))} />
        </div>
        <Input placeholder="Business / workshop name" value={business} onChange={(e) => setBusiness(e.target.value)} />
        <Select value={volume || undefined} onValueChange={setVolume}>
          <SelectTrigger className="min-h-10" aria-label="Monthly purchase estimate"><SelectValue placeholder="Monthly purchase estimate" /></SelectTrigger>
          <SelectContent>
            {VOLUME_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
          </SelectContent>
        </Select>
        <Textarea
          rows={5}
          placeholder="Parts needed and quantity (e.g. 20 x 60V charger, 10 x rear shocker)"
          value={requirement}
          onChange={(e) => setRequirement(e.target.value)}
        />
        <div className="flex flex-wrap gap-3 pt-1">
          <Button disabled={sending || !requirement.trim()} onClick={() => void send()}>{sending ? "Saving…" : "Send enquiry on WhatsApp"}</Button>
          <Button asChild variant="outline">
            <a href={`tel:${BUSINESS.phone}`}>Call {BUSINESS.phone}</a>
          </Button>
        </div>
      </div>
    </div>
  );
}
