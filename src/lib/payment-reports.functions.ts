import { createServerFn } from "@tanstack/react-start";
import type { CounterReportRow, OnlineReportRow, PaymentMethodTotal, PaymentReportDocument } from "@/lib/payment-report.server";

type Row = Record<string, unknown>;
export type PaymentChartPoint = { date: string; cash: number; upi: number; vendorQr: number; bankTransfer: number; cheque: number; other: number };
export type PaymentReportSummary = { counterAmount: number; counterCount: number; onlineGross: number; onlineCount: number; onlineRefunded: number; onlineNet: number; methods: PaymentMethodTotal[]; chart: PaymentChartPoint[] };
export type PaymentReportPage = { summary: PaymentReportSummary; counter: { items: CounterReportRow[]; total: number }; online: { items: OnlineReportRow[]; total: number } };

function validInput(data: { from: string; to: string; counterPage?: number; onlinePage?: number; pageSize?: number }) {
  const from = String(data?.from ?? "");
  const to = String(data?.to ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) throw new Error("Choose a valid report period.");
  const days = Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86400000);
  if (days < 0 || days > 366) throw new Error("The report period must be between 1 and 367 days.");
  return { from, to, counterPage: Math.max(0, Math.floor(Number(data.counterPage ?? 0))), onlinePage: Math.max(0, Math.floor(Number(data.onlinePage ?? 0))), pageSize: Math.min(100, Math.max(10, Math.floor(Number(data.pageSize ?? 25)))) };
}

async function reportAdmin() {
  const { requireStaff } = await import("@/lib/staff.server");
  await requireStaff({ capability: "reports" });
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

const mapCounter = (row: Row): CounterReportRow => ({ receivedOn: String(row['received_on']), humanId: String(row['human_id']), customerName: String(row['customer_name']), amount: Number(row['amount']), method: String(row['method']), vendorName: row['vendor_name'] ? String(row['vendor_name']) : null, reference: row['reference'] ? String(row['reference']) : null, note: row['note'] ? String(row['note']) : null, recordedBy: String(row['recorded_by_name']), recordedByEmail: row['recorded_by_email'] ? String(row['recorded_by_email']) : null });
const mapOnline = (row: Row): OnlineReportRow => ({ paidAt: String(row['paid_at']), humanId: String(row['human_id']), customerName: String(row['customer_name']), provider: String(row['provider']), paymentId: row['payment_id'] ? String(row['payment_id']) : null, gross: Number(row['gross']), refunded: Number(row['refunded']), net: Number(row['net']), status: String(row['status']) });
const mapSummary = (source: Row | null): PaymentReportSummary => ({ counterAmount: Number(source?.['counterAmount'] ?? 0), counterCount: Number(source?.['counterCount'] ?? 0), onlineGross: Number(source?.['onlineGross'] ?? 0), onlineCount: Number(source?.['onlineCount'] ?? 0), onlineRefunded: Number(source?.['onlineRefunded'] ?? 0), onlineNet: Number(source?.['onlineNet'] ?? 0), methods: ((source?.['methods'] ?? []) as Row[]).map((item) => ({ method: String(item['method']), payments: Number(item['payments']), amount: Number(item['amount']) })), chart: ((source?.['chart'] ?? []) as Row[]).map((item) => ({ date: String(item['date']), cash: Number(item['cash']), upi: Number(item['upi']), vendorQr: Number(item['vendorQr']), bankTransfer: Number(item['bankTransfer']), cheque: Number(item['cheque']), other: Number(item['other']) })) });

async function loadPage(input: ReturnType<typeof validInput>): Promise<PaymentReportPage> {
  const sb = await reportAdmin();
  const [summaryResult, counterResult, onlineResult] = await Promise.all([
    sb.rpc("payment_report_summary", { p_from: input.from, p_to: input.to }),
    sb.rpc("counter_payment_report_page", { p_from: input.from, p_to: input.to, p_offset: input.counterPage * input.pageSize, p_limit: input.pageSize }),
    sb.rpc("online_payment_report_page", { p_from: input.from, p_to: input.to, p_offset: input.onlinePage * input.pageSize, p_limit: input.pageSize }),
  ]);
  for (const result of [summaryResult, counterResult, onlineResult]) if (result.error) throw new Error(result.error.message);
  const counterRows = (counterResult.data ?? []) as Row[];
  const onlineRows = (onlineResult.data ?? []) as Row[];
  return { summary: mapSummary((summaryResult.data ?? null) as Row | null), counter: { items: counterRows.map(mapCounter), total: Number(counterRows[0]?.['total_count'] ?? 0) }, online: { items: onlineRows.map(mapOnline), total: Number(onlineRows[0]?.['total_count'] ?? 0) } };
}

export const paymentReport = createServerFn({ method: "POST" }).inputValidator(validInput).handler(({ data }) => loadPage(data));

async function loadAll(from: string, to: string) {
  const first = await loadPage({ from, to, counterPage: 0, onlinePage: 0, pageSize: 100 });
  const counter = [...first.counter.items];
  const online = [...first.online.items];
  for (let page = 1; page * 100 < first.counter.total; page += 1) counter.push(...(await loadPage({ from, to, counterPage: page, onlinePage: 0, pageSize: 100 })).counter.items);
  for (let page = 1; page * 100 < first.online.total; page += 1) online.push(...(await loadPage({ from, to, counterPage: 0, onlinePage: page, pageSize: 100 })).online.items);
  return { summary: first.summary, counter, online };
}

const csvCell = (value: unknown) => `"${String(value ?? "").replace(/"/g, '""')}"`;
export const exportPaymentReportCsv = createServerFn({ method: "POST" }).inputValidator((data: { from: string; to: string }) => validInput(data)).handler(async ({ data }) => {
  const report = await loadAll(data.from, data.to);
  const lines = [
    ["Payment report", `${data.from} to ${data.to}`],
    ["Counter collected", report.summary.counterAmount], ["Counter receipts", report.summary.counterCount], ["Online gross", report.summary.onlineGross], ["Online refunds", report.summary.onlineRefunded], ["Online net", report.summary.onlineNet], [],
    ["COUNTER-SALE RECEIPTS"], ["Date", "Invoice", "Customer", "Amount", "Method", "Vendor", "Reference", "Note", "Recorded by", "Staff email"],
    ...report.counter.map((row) => [row.receivedOn, row.humanId, row.customerName, row.amount, row.method, row.vendorName, row.reference, row.note, row.recordedBy, row.recordedByEmail]), [],
    ["ONLINE PAYMENTS AND REFUNDS"], ["Date", "Order", "Customer", "Provider", "Payment ID", "Gross", "Refunded", "Net", "Status"],
    ...report.online.map((row) => [row.paidAt, row.humanId, row.customerName, row.provider, row.paymentId, row.gross, row.refunded, row.net, row.status]),
  ];
  return { csv: lines.map((line) => line.map(csvCell).join(",")).join("\r\n"), fileName: `payment-report-${data.from}-to-${data.to}.csv` };
});

export const exportPaymentReportPdf = createServerFn({ method: "POST" }).inputValidator((data: { from: string; to: string }) => validInput(data)).handler(async ({ data }) => {
  const report = await loadAll(data.from, data.to);
  const document: PaymentReportDocument = { from: data.from, to: data.to, ...report };
  const { createPaymentReportPdf } = await import("@/lib/payment-report.server");
  const bytes = await createPaymentReportPdf(document);
  return { base64: Buffer.from(bytes).toString("base64"), fileName: `payment-report-${data.from}-to-${data.to}.pdf` };
});