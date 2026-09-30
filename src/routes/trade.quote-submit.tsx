import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SectionHeading } from "@/components/site/Empty";
import { SparkCharge, SparkRing } from "@/components/site/SparkLoaders";
import { useQuoteAccess, useQuoteList } from "@/hooks/useQuoteList";
import { canonical } from "@/lib/catalog";
import { errorCount, focusFirstInvalid, validateNameAndPhones, validationSummary, type FieldErrors } from "@/lib/form-validation";
import { useT } from "@/lib/i18n";
import { productsByIdsQuery } from "@/lib/queries";
import { submitQuoteRequest } from "@/lib/quote-requests.functions";

type QuoteFields = "name" | "phone";

export const Route = createFileRoute("/trade/quote-submit")({
  head: () => ({
    meta: [
      { title: "Submit Wholesale Quote — Shaw Traders EV" },
      { name: "description", content: "Submit your EV parts list to Shaw Traders EV for wholesale rates." },
      { property: "og:title", content: "Submit Wholesale Quote — Shaw Traders EV" },
      { property: "og:description", content: "Send your wholesale parts list for current rates." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
    links: [{ rel: "canonical", href: canonical("/trade/quote-submit") }],
  }),
  component: QuoteSubmitPage,
});

function QuoteSubmitPage() {
  const t = useT();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const access = useQuoteAccess();
  const quote = useQuoteList();
  const formRef = useRef<HTMLFormElement>(null);
  const submittingRef = useRef(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const application = access.account?.application;
  const productsQuery = useQuery(productsByIdsQuery(quote.lines.map((line) => line.productId)));
  const byId = new Map((productsQuery.data ?? []).map((product) => [product.id, product]));

  useEffect(() => {
    setName((current) => current || application?.contactPerson || application?.businessName || "");
    setPhone((current) => current || application?.phone || "");
    setNote((current) => current || quote.note);
  }, [application, quote.note]);

  const namePhoneErrors = validateNameAndPhones({ name, phone });
  const errors: FieldErrors<QuoteFields> = submitted ? { name: namePhoneErrors.name, phone: namePhoneErrors.phone } : {};

  const send = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submittingRef.current) return;
    setSubmitted(true);
    if (errorCount(namePhoneErrors) > 0) {
      toast.error(validationSummary(namePhoneErrors));
      focusFirstInvalid(formRef.current);
      return;
    }
    if (quote.lines.length === 0) return;
    submittingRef.current = true;
    setBusy(true);
    const contact = `Contact: ${name.trim()}, ${phone.trim()}`;
    const customerNote = [contact, note.trim()].filter(Boolean).join("\n").slice(0, 500);
    try {
      const result = await submitQuoteRequest({ data: { lines: quote.lines, customerNote } });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      quote.clear();
      await queryClient.invalidateQueries({ queryKey: ["my-quote-requests"] });
      toast.success(t("quote.success"));
      void navigate({ to: "/account", hash: "quotes" });
    } finally {
      submittingRef.current = false;
      setBusy(false);
    }
  };

  if (!access.ready || !quote.ready || (quote.lines.length > 0 && productsQuery.isPending)) return <div className="container-page"><SparkCharge label="Loading your quote…" /></div>;
  if (!access.allowed) return <div className="container-page py-16 text-center"><SectionHeading title="Wholesale account required" /><Button asChild><Link to="/trade">Open wholesale account</Link></Button></div>;
  if (quote.lines.length === 0) return <div className="container-page py-16 text-center"><SectionHeading title={t("quote.empty")} /><Button asChild><Link to="/shop">{t("quote.browse")}</Link></Button></div>;

  return (
    <form ref={formRef} className="container-page max-w-3xl py-10" onSubmit={send} noValidate>
      <SectionHeading as="h1" title={t("quote.submit")} subtitle={t("quote.subtitle")} />
      <div className="grid gap-3 rounded-2xl border border-border bg-card p-5">
        {quote.lines.map((line) => <div key={line.productId} className="flex justify-between gap-4 border-b border-border pb-3 text-sm last:border-0 last:pb-0"><span><strong>{byId.get(line.productId)?.name ?? "Part"}</strong><span className="block text-xs text-muted-foreground">SKU: {byId.get(line.productId)?.sku ?? "—"}</span></span><span className="shrink-0 font-semibold">Qty {line.qty}</span></div>)}
      </div>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="grid gap-1.5"><Label htmlFor="quote-name">Contact name</Label><Input id="quote-name" value={name} onChange={(event) => setName(event.target.value)} aria-invalid={errors.name ? true : undefined} aria-describedby={errors.name ? "quote-name-error" : undefined} />{errors.name && <p id="quote-name-error" role="alert" className="text-xs text-destructive">{errors.name}</p>}</div>
        <div className="grid gap-1.5"><Label htmlFor="quote-phone">Mobile number</Label><Input id="quote-phone" inputMode="numeric" maxLength={10} value={phone} onChange={(event) => setPhone(event.target.value.replace(/\D/g, "").slice(0, 10))} aria-invalid={errors.phone ? true : undefined} aria-describedby={errors.phone ? "quote-phone-error" : undefined} />{errors.phone && <p id="quote-phone-error" role="alert" className="text-xs text-destructive">{errors.phone}</p>}</div>
        <div className="grid gap-1.5 sm:col-span-2"><Label htmlFor="quote-note">Note (optional)</Label><Textarea id="quote-note" rows={5} maxLength={430} value={note} onChange={(event) => { setNote(event.target.value); quote.setNote(event.target.value); }} placeholder="Delivery timing, preferred brand, or unmatched parts" /></div>
      </div>
      <div className="mt-6 flex flex-wrap gap-3"><Button type="button" variant="outline" asChild><Link to="/trade/quote-list">Back to quote list</Link></Button><Button type="submit" disabled={busy}>{busy ? <SparkRing /> : null}{busy ? "Submitting…" : t("quote.submit")}</Button></div>
    </form>
  );
}