import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AlertTriangle, CheckCircle2, Clock3, CreditCard, RefreshCw, Search, WifiOff, XCircle } from "lucide-react";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ExportCsvButton } from "@/components/manage/ExportCsvButton";
import { ListPager } from "@/components/manage/ListPager";
import { SparkCharge } from "@/components/site/SparkLoaders";
import { formatINR } from "@/lib/catalog";
import { MANAGE_QUERY_OPTIONS } from "@/lib/manage-query";
import { exportRazorpayReconciliationCsv, razorpayReconciliation, type ReconciliationItem } from "@/lib/payment-reconciliation.functions";

export const Route = createFileRoute("/manage/razorpay-review")({
  head: () => ({ meta: [{ title: "Razorpay Review — Shaw Traders EV Manager" }, { name: "description", content: "Review Razorpay transactions against online orders." }, { name: "robots", content: "noindex" }, { property: "og:title", content: "Razorpay Review — Shaw Traders EV Manager" }, { property: "og:description", content: "Authorized online-payment reconciliation for Shaw Traders EV." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: RazorpayReviewPage,
});

const states = ["all", "attention", "pending", "failed", "mismatched", "matched", "unavailable"];

function RazorpayReviewPage() {
  const [q, setQ] = useState(""); const [state, setState] = useState("all"); const [from, setFrom] = useState(""); const [to, setTo] = useState(""); const [page, setPage] = useState(0);
  const getReview = useServerFn(razorpayReconciliation); const getCsv = useServerFn(exportRazorpayReconciliationCsv);
  const filters = { q, state, from, to, page };
  const query = useQuery({ queryKey: ["razorpay-review", filters], queryFn: () => getReview({ data: filters }), placeholderData: (old) => old, ...MANAGE_QUERY_OPTIONS });
  const counts = useMemo(() => Object.fromEntries(states.slice(1).map((key) => [key, query.data?.items.filter((item) => item.state === key).length ?? 0])), [query.data]);
  const setFilter = (apply: () => void) => { apply(); setPage(0); };
  return <div className="space-y-6">
    <header className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-5"><div><div className="flex items-center gap-2"><CreditCard className="size-6 text-primary" /><h2 className="font-display text-2xl font-bold">Razorpay Review</h2></div><p className="mt-1 text-sm text-muted-foreground">Compare online orders with Razorpay's current payment state.</p></div><div className="flex gap-2"><ExportCsvButton dateRange onExport={(range) => getCsv({ data: { ...filters, from: range?.from ?? from, to: range?.to ?? to, page: 0 } })} /><Button variant="outline" size="sm" onClick={() => void query.refetch()} disabled={query.isFetching}><RefreshCw className={`size-4 ${query.isFetching ? "motion-safe-spin" : ""}`} /> Refresh live</Button></div></header>
    <section className="grid gap-2 sm:grid-cols-2 xl:grid-cols-6"><Metric label="Needs attention" value={(counts.attention ?? 0) + (counts.mismatched ?? 0)} icon={AlertTriangle} /><Metric label="Pending" value={counts.pending ?? 0} icon={Clock3} /><Metric label="Failed" value={counts.failed ?? 0} icon={XCircle} /><Metric label="Mismatched" value={counts.mismatched ?? 0} icon={AlertTriangle} /><Metric label="Matched" value={counts.matched ?? 0} icon={CheckCircle2} /><Metric label="Could not check" value={counts.unavailable ?? 0} icon={WifiOff} /></section>
    <section className="grid gap-3 border-y border-border py-4 md:grid-cols-[minmax(14rem,1fr)_12rem_10rem_10rem]"><label className="relative"><Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" /><Input className="pl-9" value={q} onChange={(event) => setFilter(() => setQ(event.target.value))} placeholder="Order or payment ID" /></label><Select value={state} onValueChange={(value) => setFilter(() => setState(value))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{states.map((item) => <SelectItem key={item} value={item} className="capitalize">{item === "all" ? "All states" : item}</SelectItem>)}</SelectContent></Select><Input aria-label="From date" type="date" value={from} onChange={(event) => setFilter(() => setFrom(event.target.value))} /><Input aria-label="To date" type="date" value={to} onChange={(event) => setFilter(() => setTo(event.target.value))} /></section>
    {query.isPending || !query.data ? <SparkCharge label="Checking Razorpay…" /> : <>
      {query.data.items.length === 0 ? <p className="border-y border-dashed border-border py-10 text-center text-sm text-muted-foreground">No online payments match these filters.</p> : <div className="space-y-2">{query.data.items.map((item) => <PaymentRow key={item.orderId} item={item} />)}</div>}
      <ListPager page={page} total={query.data.total} busy={query.isFetching} onPage={setPage} />
      <section className="space-y-3 border-t border-border pt-6"><div><h3 className="font-display text-lg font-bold">Unmatched callbacks</h3><p className="text-sm text-muted-foreground">Signed Razorpay callbacks that could not be connected to an order or booking.</p></div>{query.data.unmatched.length ? <div className="divide-y rounded-md border">{query.data.unmatched.map((event) => <div key={event.id} className="grid gap-1 p-3 text-sm sm:grid-cols-3"><strong>{event.eventType ?? "Unknown event"}</strong><span className="font-mono text-xs">{event.eventId}</span><span className="text-muted-foreground sm:text-right">{new Date(event.createdAt).toLocaleString("en-IN")}</span></div>)}</div> : <p className="text-sm text-muted-foreground">No unmatched callbacks in this period.</p>}</section>
    </>}
  </div>;
}

function Metric({ label, value, icon: Icon }: { label: string; value: number; icon: typeof AlertTriangle }) { return <div className="flex items-center gap-3 border-l-2 border-primary bg-muted/40 p-3"><Icon className="size-5 text-muted-foreground" /><div><p className="text-xl font-bold">{value}</p><p className="text-xs text-muted-foreground">{label}</p></div></div>; }
function PaymentRow({ item }: { item: ReconciliationItem }) { const badge = item.state === "matched" ? "secondary" : item.state === "failed" || item.state === "mismatched" || item.state === "attention" ? "destructive" : "outline"; return <article className="grid gap-3 rounded-md border p-4 text-sm lg:grid-cols-[1.2fr_1fr_1fr_1.4fr_auto] lg:items-center"><div><Link to="/manage/orders/$orderId" params={{ orderId: item.orderId }} className="font-bold underline underline-offset-4">{item.humanId}</Link><p className="text-muted-foreground">{item.customerName} · {new Date(item.placedAt).toLocaleString("en-IN")}</p></div><div><strong>{formatINR(item.total)}</strong><p className="text-muted-foreground">Local: {item.localStatus}</p></div><div className="min-w-0"><p className="truncate font-mono text-xs">{item.providerPaymentId ?? item.providerOrderId ?? "No provider ID"}</p><p className="text-muted-foreground">Razorpay: {item.providerPaymentStatus ?? item.providerOrderStatus ?? "Not available"}</p></div><p>{item.reason}{item.lastEvent && <span className="block text-xs text-muted-foreground">Last callback: {item.lastEvent}</span>}</p><Badge variant={badge} className="w-fit capitalize">{item.state}</Badge></article>; }