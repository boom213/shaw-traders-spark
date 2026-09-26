import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { BarChart3, CalendarDays, Download, FileSpreadsheet, Loader2, ReceiptText, RotateCcw } from "lucide-react";
import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatINR } from "@/lib/catalog";
import { MANAGE_QUERY_OPTIONS } from "@/lib/manage-query";
import { exportPaymentReportCsv, exportPaymentReportPdf, paymentReport, type PaymentChartPoint } from "@/lib/payment-reports.functions";

export const Route = createFileRoute("/manage/payment-reports")({
  head: () => ({ meta: [
    { title: "Payment Reports — Shaw Traders EV Manager" },
    { name: "description", content: "Counter-sales collection reports, online payment reconciliation, charts and exports." },
    { name: "robots", content: "noindex" },
    { property: "og:title", content: "Payment Reports — Shaw Traders EV Manager" },
    { property: "og:description", content: "Counter-sales and online payment reporting for authorized managers." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: PaymentReportsPage,
});

type Range = "daily" | "weekly" | "monthly" | "custom";
const PAGE_SIZE = 25;
const CHART_KEYS = [
  { key: "cash", label: "Cash", color: "var(--chart-1)" },
  { key: "upi", label: "UPI", color: "var(--chart-2)" },
  { key: "vendorQr", label: "Vendor QR", color: "var(--chart-3)" },
  { key: "bankTransfer", label: "Bank transfer", color: "var(--chart-4)" },
  { key: "cheque", label: "Cheque", color: "var(--chart-5)" },
  { key: "other", label: "Other", color: "var(--muted-foreground)" },
] as const;

function indianDate(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}
function period(range: Exclude<Range, "custom">) {
  const to = indianDate();
  const end = new Date(`${to}T00:00:00Z`);
  if (range === "daily") return { from: to, to };
  if (range === "weekly") return { from: new Date(end.getTime() - 6 * 86400000).toISOString().slice(0, 10), to };
  return { from: `${to.slice(0, 8)}01`, to };
}
function downloadBase64(base64: string, fileName: string, type: string) {
  const bytes = Uint8Array.from(atob(base64), (character) => character.charCodeAt(0));
  const url = URL.createObjectURL(new Blob([bytes], { type }));
  const anchor = document.createElement("a"); anchor.href = url; anchor.download = fileName; anchor.click(); URL.revokeObjectURL(url);
}

function PaymentReportsPage() {
  const initial = period("monthly");
  const [range, setRange] = useState<Range>("monthly");
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);
  const [counterPage, setCounterPage] = useState(0);
  const [onlinePage, setOnlinePage] = useState(0);
  const [exporting, setExporting] = useState<"csv" | "pdf" | null>(null);
  const getReport = useServerFn(paymentReport);
  const getCsv = useServerFn(exportPaymentReportCsv);
  const getPdf = useServerFn(exportPaymentReportPdf);
  const validRange = from <= to;
  const { data, isPending, isFetching, refetch } = useQuery({
    queryKey: ["payment-report", from, to, counterPage, onlinePage],
    queryFn: () => getReport({ data: { from, to, counterPage, onlinePage, pageSize: PAGE_SIZE } }),
    placeholderData: (previous) => previous,
    enabled: validRange,
    ...MANAGE_QUERY_OPTIONS,
  });
  const chart = useMemo(() => compressChart(data?.summary.chart ?? []), [data?.summary.chart]);

  function selectRange(value: Range) {
    setRange(value); setCounterPage(0); setOnlinePage(0);
    if (value !== "custom") { const next = period(value); setFrom(next.from); setTo(next.to); }
  }
  async function exportReport(type: "csv" | "pdf") {
    try {
      setExporting(type);
      if (type === "csv") {
        const result = await getCsv({ data: { from, to } });
        const url = URL.createObjectURL(new Blob([result.csv], { type: "text/csv;charset=utf-8" }));
        const anchor = document.createElement("a"); anchor.href = url; anchor.download = result.fileName; anchor.click(); URL.revokeObjectURL(url);
      } else {
        const result = await getPdf({ data: { from, to } });
        downloadBase64(result.base64, result.fileName, "application/pdf");
      }
      toast.success(`${type.toUpperCase()} report downloaded`);
    } catch (error) { toast.error(error instanceof Error ? error.message : "Report download failed"); }
    finally { setExporting(null); }
  }

  return <div className="space-y-7">
    <header className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-5">
      <div><div className="flex items-center gap-2"><BarChart3 className="size-6 text-primary" /><h2 className="font-display text-2xl font-bold">Payment Reports</h2></div><p className="mt-1 text-sm text-muted-foreground">Actual counter-sale receipts with online payments reconciled separately.</p></div>
      <div className="flex gap-2"><Button variant="outline" disabled={Boolean(exporting) || !validRange} onClick={() => void exportReport("csv")}>{exporting === "csv" ? <Loader2 className="size-4 animate-spin" /> : <FileSpreadsheet className="size-4" />} CSV</Button><Button disabled={Boolean(exporting) || !validRange} onClick={() => void exportReport("pdf")}>{exporting === "pdf" ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />} PDF</Button></div>
    </header>

    <section className="space-y-3 border-b border-border pb-6">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex rounded-md border border-border p-1">{(["daily", "weekly", "monthly", "custom"] as Range[]).map((value) => <Button key={value} size="sm" variant={range === value ? "default" : "ghost"} onClick={() => selectRange(value)} className="capitalize">{value}</Button>)}</div>
        {range === "custom" && <><label className="text-xs font-medium text-muted-foreground">From<Input type="date" value={from} max={to} onChange={(event) => { setFrom(event.target.value); setCounterPage(0); setOnlinePage(0); }} /></label><label className="text-xs font-medium text-muted-foreground">To<Input type="date" value={to} min={from} max={indianDate()} onChange={(event) => { setTo(event.target.value); setCounterPage(0); setOnlinePage(0); }} /></label></>}
        <div className="flex items-center gap-2 text-sm text-muted-foreground"><CalendarDays className="size-4" />{from} to {to}</div>
        <Button size="icon" variant="ghost" aria-label="Refresh report" title="Refresh report" onClick={() => void refetch()}><RotateCcw className={`size-4 ${isFetching ? "animate-spin" : ""}`} /></Button>
      </div>
      {!validRange && <p className="text-sm text-destructive">The From date must be before the To date.</p>}
    </section>

    {isPending || !data ? <div className="h-80 animate-pulse rounded-md bg-muted" /> : <>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5"><Metric label="Counter collected" value={formatINR(data.summary.counterAmount)} sub={`${data.summary.counterCount} receipt${data.summary.counterCount === 1 ? "" : "s"}`} /><Metric label="Online gross" value={formatINR(data.summary.onlineGross)} sub={`${data.summary.onlineCount} payment${data.summary.onlineCount === 1 ? "" : "s"}`} /><Metric label="Online refunds" value={formatINR(data.summary.onlineRefunded)} sub="Recorded in this period" /><Metric label="Online net" value={formatINR(data.summary.onlineNet)} sub="Gross less refunds" /><Metric label="Total net received" value={formatINR(data.summary.counterAmount + data.summary.onlineNet)} sub="Counter plus online net" /></div>

      <section className="space-y-4">
        <div><h3 className="font-display text-lg font-bold">Counter-sales collection trend</h3><p className="text-sm text-muted-foreground">Receipts grouped by collection date and payment method.</p></div>
        <div className="h-80 w-full border-y border-border py-4">
          {data.summary.counterCount === 0 ? <div className="grid h-full place-items-center text-sm text-muted-foreground">No counter-sale payments in this period.</div> : <ResponsiveContainer width="100%" height="100%"><BarChart data={chart} margin={{ left: 8, right: 8 }}><CartesianGrid stroke="var(--border)" vertical={false} /><XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={11} /><YAxis tickFormatter={(value) => `₹${Number(value).toLocaleString("en-IN")}`} tickLine={false} axisLine={false} width={72} fontSize={11} /><Tooltip content={<ChartTooltip />} />{CHART_KEYS.map((item) => <Bar key={item.key} dataKey={item.key} name={item.label} stackId="payments" fill={item.color} radius={item.key === "other" ? [3, 3, 0, 0] : 0} />)}</BarChart></ResponsiveContainer>}
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{data.summary.methods.map((method) => <div key={method.method} className="flex items-center justify-between border-b border-border px-1 py-2 text-sm"><span>{method.method} <span className="text-muted-foreground">· {method.payments}</span></span><strong>{formatINR(method.amount)}</strong></div>)}</div>
      </section>

      <ReportSection title="Counter-sale receipts" description="Each row is money actually recorded against a counter sale." total={data.counter.total} page={counterPage} setPage={setCounterPage} isFetching={isFetching}>
        <table className="w-full min-w-[1050px] text-sm"><thead className="sticky top-0 bg-muted text-left text-xs uppercase text-muted-foreground"><tr><Th>Date</Th><Th>Invoice / customer</Th><Th>Method</Th><Th>Vendor</Th><Th>Reference / note</Th><Th>Recorded by</Th><Th right>Amount</Th></tr></thead><tbody>{data.counter.items.map((row) => <tr key={`${row.humanId}-${row.receivedOn}-${row.amount}-${row.reference}`} className="border-t"><Td>{row.receivedOn}</Td><Td><strong>{row.humanId}</strong><span>{row.customerName}</span></Td><Td>{row.method}</Td><Td>{row.vendorName ?? "—"}</Td><Td>{row.reference ?? row.note ?? "—"}</Td><Td>{row.recordedBy}<span>{row.recordedByEmail}</span></Td><Td right><strong>{formatINR(row.amount)}</strong></Td></tr>)}</tbody></table>
      </ReportSection>

      <ReportSection title="Online payments and refunds" description="Confirmed storefront online activity; Cash on Delivery and counter sales are excluded." total={data.online.total} page={onlinePage} setPage={setOnlinePage} isFetching={isFetching}>
        <table className="w-full min-w-[980px] text-sm"><thead className="sticky top-0 bg-muted text-left text-xs uppercase text-muted-foreground"><tr><Th>Date</Th><Th>Order / customer</Th><Th>Provider</Th><Th>Payment ID</Th><Th right>Gross</Th><Th right>Refunded</Th><Th right>Net</Th><Th>Status</Th></tr></thead><tbody>{data.online.items.map((row) => <tr key={`${row.humanId}-${row.paidAt}-${row.status}`} className="border-t"><Td>{new Date(row.paidAt).toLocaleString("en-IN")}</Td><Td><strong>{row.humanId}</strong><span>{row.customerName}</span></Td><Td className="capitalize">{row.provider}</Td><Td>{row.paymentId ?? "—"}</Td><Td right>{formatINR(row.gross)}</Td><Td right>{formatINR(row.refunded)}</Td><Td right><strong>{formatINR(row.net)}</strong></Td><Td className="capitalize">{row.status}</Td></tr>)}</tbody></table>
      </ReportSection>
    </>}
  </div>;
}

function compressChart(rows: PaymentChartPoint[]) {
  if (rows.length <= 35) return rows.map((row) => ({ ...row, label: new Date(`${row.date}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) }));
  const months = new Map<string, PaymentChartPoint>();
  for (const row of rows) { const key = row.date.slice(0, 7); const current = months.get(key) ?? { date: `${key}-01`, cash: 0, upi: 0, vendorQr: 0, bankTransfer: 0, cheque: 0, other: 0 }; for (const item of CHART_KEYS) current[item.key] += row[item.key]; months.set(key, current); }
  return [...months.values()].map((row) => ({ ...row, label: new Date(`${row.date}T00:00:00`).toLocaleDateString("en-IN", { month: "short", year: "2-digit" }) }));
}
function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) { if (!active || !payload) return null; return <div className="rounded-md border bg-popover p-3 text-xs shadow-lg"><p className="mb-2 font-semibold">{label}</p>{payload.filter((item) => item.value > 0).map((item) => <p key={item.name} className="flex min-w-44 justify-between gap-5"><span>{item.name}</span><strong>{formatINR(item.value)}</strong></p>)}</div>; }
function Metric({ label, value, sub }: { label: string; value: string; sub: string }) { return <div className="border-l-4 border-primary bg-muted/40 p-4"><p className="text-xs font-semibold uppercase text-muted-foreground">{label}</p><p className="mt-1 text-xl font-bold">{value}</p><p className="mt-1 text-xs text-muted-foreground">{sub}</p></div>; }
function ReportSection({ title, description, total, page, setPage, isFetching, children }: { title: string; description: string; total: number; page: number; setPage: React.Dispatch<React.SetStateAction<number>>; isFetching: boolean; children: React.ReactNode }) { const pages = Math.max(1, Math.ceil(total / PAGE_SIZE)); return <section className="space-y-3 border-t border-border pt-6"><div className="flex items-start gap-2"><ReceiptText className="mt-0.5 size-5 text-primary" /><div><h3 className="font-display text-lg font-bold">{title}</h3><p className="text-sm text-muted-foreground">{description}</p></div></div>{total === 0 ? <p className="border-y border-dashed border-border py-8 text-center text-sm text-muted-foreground">No records in this period.</p> : <><div className="max-h-[32rem] overflow-auto rounded-md border">{children}</div><div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground"><span>{page * PAGE_SIZE + 1}–{Math.min(total, (page + 1) * PAGE_SIZE)} of {total}{isFetching ? " · Updating…" : ""}</span><div className="flex items-center gap-2"><Button size="sm" variant="outline" disabled={page === 0 || isFetching} onClick={() => setPage((value) => Math.max(0, value - 1))}>Previous</Button><span>Page {page + 1} of {pages}</span><Button size="sm" variant="outline" disabled={page + 1 >= pages || isFetching} onClick={() => setPage((value) => value + 1)}>Next</Button></div></div></>}</section>; }
function Th({ children, right = false }: { children: React.ReactNode; right?: boolean }) { return <th className={`px-3 py-2 ${right ? "text-right" : ""}`}>{children}</th>; }
function Td({ children, right = false, className = "" }: { children: React.ReactNode; right?: boolean; className?: string }) { return <td className={`px-3 py-2 align-top ${right ? "text-right" : ""} ${className}`}>{children}{typeof children !== "string" && null}</td>; }