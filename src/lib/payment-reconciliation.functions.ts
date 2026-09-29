import { createServerFn } from "@tanstack/react-start";
import { csvFileName, toCsv, type CsvExportResult } from "@/lib/csv";
import { classifyRazorpayPayment, type ReconciliationState } from "@/lib/payment-reconciliation";

type Input = { q: string; state: string; from: string; to: string; page: number; pageSize?: number };
export type ReconciliationItem = { orderId: string; humanId: string; customerName: string; placedAt: string; total: number; localStatus: string; providerOrderId: string | null; providerPaymentId: string | null; providerOrderStatus: string | null; providerPaymentStatus: string | null; providerAmountPaise: number | null; providerCurrency: string | null; lastEvent: string | null; lastEventAt: string | null; state: ReconciliationState; reason: string };
export type UnmatchedPaymentEvent = { id: string; eventId: string; eventType: string | null; createdAt: string };
export type ReconciliationPage = { items: ReconciliationItem[]; total: number; unmatched: UnmatchedPaymentEvent[] };

const input = (value: Partial<Input> | undefined): Input => ({
  q: String(value?.q ?? "").trim().slice(0, 120),
  state: ["attention", "pending", "failed", "mismatched", "matched", "unavailable"].includes(String(value?.state)) ? String(value?.state) : "all",
  from: /^\d{4}-\d{2}-\d{2}$/.test(String(value?.from ?? "")) ? String(value?.from) : "",
  to: /^\d{4}-\d{2}-\d{2}$/.test(String(value?.to ?? "")) ? String(value?.to) : "",
  page: Math.max(0, Math.floor(Number(value?.page ?? 0))),
  pageSize: Math.min(10_000, Math.max(8, Math.floor(Number(value?.pageSize ?? 8)))),
});

function nameFromAddress(address: unknown) {
  if (!address || typeof address !== "object" || Array.isArray(address)) return "Customer";
  const name = (address as Record<string, unknown>)["name"];
  return typeof name === "string" && name.trim() ? name : "Customer";
}

async function load(data: Input): Promise<ReconciliationPage> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: counterRows, error: counterError } = await supabaseAdmin.from("counter_sales").select("order_id").not("order_id", "is", null);
  if (counterError) throw new Error(counterError.message);
  const counterIds = (counterRows ?? []).map((row) => row.order_id).filter((id): id is string => Boolean(id));
  let query = supabaseAdmin.from("orders").select("id, human_id, address, placed_at, total, payment_status, provider_order_id, provider_payment_id, needs_payment_review", { count: "exact" }).eq("payment_provider", "razorpay").order("placed_at", { ascending: false });
  if (counterIds.length) query = query.not("id", "in", `(${counterIds.join(",")})`);
  const safeQ = data.q.replaceAll(",", "").replaceAll("%", "");
  if (safeQ) query = query.or(`human_id.ilike.%${safeQ}%,provider_order_id.ilike.%${safeQ}%,provider_payment_id.ilike.%${safeQ}%`);
  if (data.from) query = query.gte("placed_at", `${data.from}T00:00:00+05:30`);
  if (data.to) { const next = new Date(`${data.to}T00:00:00+05:30`); next.setDate(next.getDate() + 1); query = query.lt("placed_at", next.toISOString()); }
  const size = data.pageSize ?? 8;
  const { data: rows, count, error } = await query.range(data.page * size, data.page * size + size - 1);
  if (error) throw new Error(error.message);
  const ids = (rows ?? []).map((row) => row.id);
  const events = ids.length ? await supabaseAdmin.from("payment_events").select("order_id, event_type, created_at").in("order_id", ids).order("created_at", { ascending: false }) : { data: [], error: null };
  if (events.error) throw new Error(events.error.message);
  const last = new Map<string, { event_type: string | null; created_at: string }>();
  for (const event of events.data ?? []) if (event.order_id && !last.has(event.order_id)) last.set(event.order_id, event);
  const { fetchRazorpayOrderWithPayments } = await import("@/lib/razorpay.server");
  const items: ReconciliationItem[] = [];
  for (let start = 0; start < (rows ?? []).length; start += 20) {
    const batch = (rows ?? []).slice(start, start + 20);
    items.push(...await Promise.all(batch.map(async (row): Promise<ReconciliationItem> => {
      const base = { orderId: row.id, humanId: row.human_id, customerName: nameFromAddress(row.address), placedAt: row.placed_at, total: Number(row.total), localStatus: row.payment_status, providerOrderId: row.provider_order_id, providerPaymentId: row.provider_payment_id, lastEvent: last.get(row.id)?.event_type ?? null, lastEventAt: last.get(row.id)?.created_at ?? null };
      if (!row.provider_order_id) { const result = classifyRazorpayPayment({ totalRupees: Number(row.total), paymentStatus: row.payment_status, providerOrderId: null, providerPaymentId: row.provider_payment_id, needsPaymentReview: row.needs_payment_review }, null, []); return { ...base, providerOrderStatus: null, providerPaymentStatus: null, providerAmountPaise: null, providerCurrency: null, state: result.state, reason: result.reason }; }
      const live = await fetchRazorpayOrderWithPayments(row.provider_order_id);
      if ("error" in live) return { ...base, providerOrderStatus: null, providerPaymentStatus: null, providerAmountPaise: null, providerCurrency: null, state: "unavailable", reason: live.error };
      const result = classifyRazorpayPayment({ totalRupees: Number(row.total), paymentStatus: row.payment_status, providerOrderId: row.provider_order_id, providerPaymentId: row.provider_payment_id, needsPaymentReview: row.needs_payment_review }, live.order, live.payments);
      return { ...base, providerPaymentId: result.payment?.id ?? row.provider_payment_id, providerOrderStatus: live.order.status, providerPaymentStatus: result.payment?.status ?? null, providerAmountPaise: result.payment?.amountPaise ?? live.order.amount, providerCurrency: result.payment?.currency ?? live.order.currency, state: result.state, reason: result.reason };
    })));
  }
  let unmatched = supabaseAdmin.from("payment_events").select("id, event_id, event_type, created_at").eq("provider", "razorpay").is("order_id", null).is("booking_id", null).order("created_at", { ascending: false }).limit(8);
  if (data.from) unmatched = unmatched.gte("created_at", `${data.from}T00:00:00+05:30`);
  if (data.to) unmatched = unmatched.lte("created_at", `${data.to}T23:59:59+05:30`);
  const unmatchedResult = await unmatched;
  if (unmatchedResult.error) throw new Error(unmatchedResult.error.message);
  return { items: data.state === "all" ? items : items.filter((item) => item.state === data.state), total: Number(count ?? 0), unmatched: (unmatchedResult.data ?? []).map((row) => ({ id: row.id, eventId: row.event_id, eventType: row.event_type, createdAt: row.created_at })) };
}

export const razorpayReconciliation = createServerFn({ method: "POST" }).inputValidator(input).handler(async ({ data }) => { const { requireStaff } = await import("@/lib/staff.server"); await requireStaff({ capability: "reports" }); return load(data); });

export const exportRazorpayReconciliationCsv = createServerFn({ method: "POST" }).inputValidator(input).handler(async ({ data }): Promise<CsvExportResult> => {
  const { csvExportContext, auditCsvExport } = await import("@/lib/csv.server");
  const context = await csvExportContext();
  const report = await load({ ...data, page: 0, pageSize: 10_000 });
  const rows = report.items.map((row) => [row.placedAt, row.humanId, row.customerName, row.total, row.localStatus, row.state, row.reason, row.providerOrderId, row.providerOrderStatus, row.providerPaymentId, row.providerPaymentStatus, row.providerAmountPaise, row.providerCurrency, row.lastEvent, row.lastEventAt]);
  const output = { csv: toCsv(["Placed", "Order", "Customer", "Local total", "Local status", "Review state", "Reason", "Razorpay order ID", "Razorpay order status", "Payment ID", "Payment status", "Provider amount (paise)", "Currency", "Last callback", "Callback time"], rows), fileName: csvFileName("razorpay-review"), rows: rows.length, truncated: report.total > rows.length };
  await auditCsvExport(context.sb as never, context.actor, context.logAudit, "razorpay-review", output, { q: data.q, state: data.state, from: data.from, to: data.to });
  return output;
});