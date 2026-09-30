import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { ChevronDown, ChevronUp, Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SparkRing } from "@/components/site/SparkLoaders";
import { ListPager } from "@/components/manage/ListPager";
import { MANAGE_QUERY_OPTIONS } from "@/lib/manage-query";
import { formatINR } from "@/lib/catalog";
import { downloadStaffProforma, listQuoteRequests, priceQuoteRequest, type StaffQuoteRequest } from "@/lib/quote-requests.functions";
import { downloadPdf } from "@/components/manage/order-tools";

export const Route = createFileRoute("/manage/quotes")({
  head: () => ({ meta: [
    { title: "Wholesale Quotes — Shaw Traders EV" },
    { name: "description", content: "Review and price wholesale quote requests." },
    { name: "robots", content: "noindex" },
    { property: "og:title", content: "Wholesale Quotes — Shaw Traders EV" },
    { property: "og:description", content: "Review and price wholesale quote requests." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: QuotesPage,
});

const TABS = [
  { value: "submitted", label: "Waiting" },
  { value: "priced", label: "Priced" },
  { value: "accepted", label: "Accepted" },
  { value: "rejected", label: "Rejected" },
  { value: "expired", label: "Expired" },
  { value: "all", label: "Everything" },
] as const;

function QuotesPage() {
  const [tab, setTab] = useState("submitted");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const { data, isPending } = useQuery({
    queryKey: ["manage-quotes", tab, search, page],
    queryFn: () => listQuoteRequests({ data: { status: tab, search, page } }),
    placeholderData: (previous) => previous,
    ...MANAGE_QUERY_OPTIONS,
  });
  return <div className="space-y-4">
    <div className="flex flex-wrap gap-2">
      {TABS.map((item) => <Button key={item.value} size="sm" variant={tab === item.value ? "default" : "outline"} onClick={() => { setTab(item.value); setPage(0); }}>{item.label}</Button>)}
    </div>
    <Input aria-label="Search quotes" placeholder="Search customer, phone, or quote number" value={search} onChange={(event) => { setSearch(event.target.value); setPage(0); }} />
    {isPending && [0, 1].map((index) => <div key={index} className="h-28 animate-pulse rounded-2xl bg-muted" />)}
    {!isPending && !data?.items.length && <p className="rounded-2xl border border-dashed border-border bg-surface p-8 text-center text-sm text-muted-foreground">No quote requests here.</p>}
    {data?.items.map((quote) => <QuoteCard key={quote.id} quote={quote} />)}
    <ListPager page={page} total={data?.total ?? 0} busy={isPending} onPage={setPage} />
  </div>;
}

function QuoteCard({ quote }: { quote: StaffQuoteRequest }) {
  const queryClient = useQueryClient();
  const getProforma = useServerFn(downloadStaffProforma);
  const [open, setOpen] = useState(quote.status === "submitted");
  const [prices, setPrices] = useState<Record<string, string>>(() => Object.fromEntries(quote.items.map((item) => [item.id, item.unitPrice ? String(item.unitPrice) : ""])));
  const [notes, setNotes] = useState<Record<string, string>>(() => Object.fromEntries(quote.items.map((item) => [item.id, item.lineNote ?? ""])));
  const [expiry, setExpiry] = useState(quote.expiresAt ? quote.expiresAt.slice(0, 10) : "");
  const [staffNote, setStaffNote] = useState(quote.staffNote ?? "");
  const [gstRate, setGstRate] = useState(quote.gstRate ? String(quote.gstRate) : "");
  const [gstTreatment, setGstTreatment] = useState<"inclusive" | "exclusive">(quote.gstIncluded ? "inclusive" : "exclusive");
  const [busy, setBusy] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const total = quote.items.reduce((sum, item) => sum + (Number(prices[item.id]) || 0) * item.qty, 0);

  const send = async () => {
    if (!expiry) return toast.error("Choose an expiry date.");
    const expiresAt = new Date(`${expiry}T23:59:59+05:30`).toISOString();
    if (Date.parse(expiresAt) <= Date.now()) return toast.error("Choose a future expiry date.");
    setBusy(true);
    const result = await priceQuoteRequest({ data: {
      quoteId: quote.id,
      lines: quote.items.map((item) => ({ itemId: item.id, unitPrice: Number(prices[item.id]), lineNote: notes[item.id] })),
      expiresAt,
      staffNote,
      gstRate: gstRate.trim() ? Number(gstRate) : null,
      gstIncluded: gstTreatment === "inclusive",
    } });
    setBusy(false);
    if (!result.ok) return toast.error(result.error ?? "Could not price this quote.");
    toast.success("Priced quote sent to the customer");
    void queryClient.invalidateQueries({ queryKey: ["manage-quotes"] });
  };

  const pricedTotal = quote.items.reduce((sum, item) => sum + (item.unitPrice ?? 0) * item.qty, 0);
  const expired = Boolean(quote.expiresAt && Date.parse(quote.expiresAt) <= Date.now());
  const canDownload = ["priced", "accepted"].includes(quote.status) && !expired;
  const download = async () => {
    setDownloading(true);
    const result = await getProforma({ data: { quoteId: quote.id } });
    setDownloading(false);
    if ("error" in result) return toast.error(result.error);
    downloadPdf(result.base64, result.fileName);
  };
  return <article className="rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-card)]">
    <Button type="button" variant="ghost" className="h-auto w-full justify-between gap-4 p-0 text-left hover:bg-transparent" onClick={() => setOpen((value) => !value)} aria-expanded={open}>
      <div><p className="font-semibold">{quote.humanId} · {quote.customerName}</p><p className="text-xs text-muted-foreground">{quote.customerPhone} · {new Date(quote.createdAt).toLocaleString("en-IN")} · {quote.items.length} line(s)</p></div>
      <div className="flex items-center gap-2"><span className="text-right text-sm"><strong className="capitalize">{quote.status}</strong>{pricedTotal > 0 && <span className="block">{formatINR(pricedTotal)}</span>}</span>{open ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}</div>
    </Button>
    {open && <div className="mt-4 space-y-4 border-t border-border pt-4">
      {quote.customerNote && <p className="rounded-lg bg-surface px-3 py-2 text-sm">Customer note: {quote.customerNote}</p>}
      <div className="space-y-3">{quote.items.map((item) => <div key={item.id} className="grid gap-2 rounded-lg border border-border p-3 sm:grid-cols-[1fr_10rem_1fr]">
        <div><p className="font-medium">{item.name}</p><p className="text-xs text-muted-foreground">{item.sku ?? "No SKU"} · quantity {item.qty}</p></div>
        <div><Label htmlFor={`price-${item.id}`}>Unit price</Label><Input id={`price-${item.id}`} type="number" min="0.01" step="0.01" value={prices[item.id] ?? ""} onChange={(event) => setPrices({ ...prices, [item.id]: event.target.value })} /></div>
        <div><Label htmlFor={`note-${item.id}`}>Line note (optional)</Label><Input id={`note-${item.id}`} maxLength={300} value={notes[item.id] ?? ""} onChange={(event) => setNotes({ ...notes, [item.id]: event.target.value })} /></div>
      </div>)}</div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div><Label htmlFor={`expiry-${quote.id}`}>Quote valid until</Label><Input id={`expiry-${quote.id}`} type="date" required value={expiry} onChange={(event) => setExpiry(event.target.value)} /></div>
        <div><Label htmlFor={`gst-${quote.id}`}>GST rate (optional)</Label><Input id={`gst-${quote.id}`} type="number" min="0" max="100" step="0.01" placeholder="No GST" value={gstRate} onChange={(event) => setGstRate(event.target.value)} /></div>
        <div><Label htmlFor={`gst-treatment-${quote.id}`}>GST treatment</Label><Select value={gstTreatment} onValueChange={(value) => setGstTreatment(value as "inclusive" | "exclusive")} disabled={!gstRate.trim()}><SelectTrigger id={`gst-treatment-${quote.id}`}><SelectValue /></SelectTrigger><SelectContent><SelectItem value="exclusive">Exclusive</SelectItem><SelectItem value="inclusive">Inclusive</SelectItem></SelectContent></Select></div>
        <div><Label htmlFor={`staff-note-${quote.id}`}>Internal staff note</Label><Textarea id={`staff-note-${quote.id}`} rows={2} maxLength={1000} value={staffNote} onChange={(event) => setStaffNote(event.target.value)} /></div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3"><p className="font-semibold">Quote total: {formatINR(total)}</p><div className="flex flex-wrap gap-2">{canDownload && <Button variant="outline" onClick={() => void download()} disabled={downloading}>{downloading ? <SparkRing /> : <Download className="size-4" />}{downloading ? "Preparing…" : "Download PI"}</Button>}<Button onClick={() => void send()} disabled={busy}>{busy && <SparkRing />}{busy ? "Sending…" : "Send priced quote"}</Button></div></div>
    </div>}
  </article>;
}