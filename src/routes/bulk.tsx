import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { BUSINESS, whatsappLink } from "@/lib/catalog";

export const Route = createFileRoute("/bulk")({
  head: () => ({
    meta: [
      { title: "Dealer & Bulk Orders" },
      { name: "description", content: "Bulk enquiry for e-rickshaw and EV workshops, dealers and fleet owners. Share your requirement and our Bud Bud team will quote." },
      { property: "og:title", content: "Bulk & Dealer Orders — Shaw Traders EV" },
      { property: "og:description", content: "Wholesale EV spare parts enquiries for workshops, dealers and fleets." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: BulkPage,
});

function BulkPage() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [business, setBusiness] = useState("");
  const [requirement, setRequirement] = useState("");

  const message = `Bulk enquiry — Shaw Traders EV
Name: ${name}
Phone: ${phone}
Business: ${business}
Requirement: ${requirement}`;

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
        <Input placeholder="Mobile number" value={phone} onChange={(e) => setPhone(e.target.value)} />
        <Input placeholder="Business / workshop name" value={business} onChange={(e) => setBusiness(e.target.value)} />
        <Textarea
          rows={5}
          placeholder="Parts needed and quantity (e.g. 20 x 60V charger, 10 x rear shocker)"
          value={requirement}
          onChange={(e) => setRequirement(e.target.value)}
        />
        <div className="flex flex-wrap gap-3 pt-1">
          <Button asChild disabled={!requirement.trim()}>
            <a href={whatsappLink(message)} target="_blank" rel="noreferrer">
              Send enquiry on WhatsApp
            </a>
          </Button>
          <Button asChild variant="outline">
            <a href={`tel:${BUSINESS.phone}`}>Call {BUSINESS.phone}</a>
          </Button>
        </div>
      </div>
    </div>
  );
}
