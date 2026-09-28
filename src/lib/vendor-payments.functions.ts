import { createServerFn } from "@tanstack/react-start";

type Row = Record<string, unknown>;

export type VendorSummary = {
  id: string;
  name: string;
  active: boolean;
  allTime: number;
  thisMonth: number;
  collectedAllTime: number;
  collectedThisMonth: number;
  paidOutAllTime: number;
  paidOutThisMonth: number;
};

export type VendorPaymentRow = {
  id: string;
  vendorId: string;
  vendorName: string;
  amount: number;
  paidOn: string;
  reference: string | null;
  note: string | null;
  linked: boolean;
  recordedBy: string;
  recordedByEmail: string;
  createdAt: string;
};

const text = (value: unknown, max: number) => String(value ?? "").trim().slice(0, max);

async function vendorAdmin(superAdmin = false) {
  const { requireStaff, logAudit } = await import("@/lib/staff.server");
  const actor = await requireStaff(superAdmin ? { superAdmin: true } : { capability: "vendor-finance" });
  const { supabaseAdmin: sb } = await import("@/integrations/supabase/client.server");
  return { sb, actor, logAudit };
}

export const vendorDashboard = createServerFn({ method: "POST" })
  .inputValidator((data: { page?: number; vendorId?: string; from?: string; to?: string } | undefined) => ({ page: Math.max(0, Math.floor(Number(data?.page ?? 0))), vendorId: text(data?.vendorId, 40), from: /^\d{4}-\d{2}-\d{2}$/.test(String(data?.from)) ? String(data?.from) : "", to: /^\d{4}-\d{2}-\d{2}$/.test(String(data?.to)) ? String(data?.to) : "" }))
  .handler(async ({ data }) => {
  const { sb, actor } = await vendorAdmin();
  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);
  const monthDate = monthStart.toISOString().slice(0, 10);
  let paymentQuery = sb.from("vendor_payments").select("id, vendor_id, amount, paid_on, reference, note, linked_ledger_id, created_by_name, created_by_email, created_at, qr_vendors(name)", { count: "exact" }).is("voided_at", null).order("paid_on", { ascending: false }).order("created_at", { ascending: false });
  let paymentTotalQuery = sb.from("vendor_payments").select("amount").is("voided_at", null);
  if (data.vendorId) { paymentQuery = paymentQuery.eq("vendor_id", data.vendorId); paymentTotalQuery = paymentTotalQuery.eq("vendor_id", data.vendorId); }
  if (data.from) { paymentQuery = paymentQuery.gte("paid_on", data.from); paymentTotalQuery = paymentTotalQuery.gte("paid_on", data.from); }
  if (data.to) { paymentQuery = paymentQuery.lte("paid_on", data.to); paymentTotalQuery = paymentTotalQuery.lte("paid_on", data.to); }
  const [{ data: vendors, error: vendorError }, { data: payments, error: paymentError, count }, { data: filteredRows, error: filteredError }, { data: cashRows }, { data: totalRows, error: totalError }] = await Promise.all([
    sb.from("qr_vendors").select("id, name, active, created_at").order("active", { ascending: false }).order("name"),
    paymentQuery.range(data.page * 8, data.page * 8 + 7),
    paymentTotalQuery,
    sb.from("trade_ledger").select("amount").eq("kind", "payment").eq("method", "cash").gte("received_on", monthDate),
    sb.rpc("manager_vendor_float_totals", { p_month_from: monthDate }),
  ]);
  if (vendorError) throw new Error(vendorError.message);
  if (paymentError) throw new Error(paymentError.message);
  if (filteredError) throw new Error(filteredError.message);
  if (totalError) throw new Error(totalError.message);
  const paymentRows = (payments ?? []) as Row[];
  const totals = new Map(((totalRows ?? []) as Row[]).map((row) => [String(row["vendor_id"]), row]));
  const summaries = ((vendors ?? []) as Row[]).map((vendor): VendorSummary => {
    const total = totals.get(String(vendor["id"]));
    return {
      id: String(vendor["id"]), name: String(vendor["name"]), active: Boolean(vendor["active"]),
       allTime: Number(total?.["collected_all_time"] ?? 0) + Number(total?.["paid_out_all_time"] ?? 0),
       thisMonth: Number(total?.["collected_this_month"] ?? 0) + Number(total?.["paid_out_this_month"] ?? 0),
       collectedAllTime: Number(total?.["collected_all_time"] ?? 0),
       collectedThisMonth: Number(total?.["collected_this_month"] ?? 0),
       paidOutAllTime: Number(total?.["paid_out_all_time"] ?? 0),
       paidOutThisMonth: Number(total?.["paid_out_this_month"] ?? 0),
    };
  });
  return {
    vendors: summaries,
    payments: paymentRows.map((payment): VendorPaymentRow => ({
      id: String(payment["id"]), vendorId: String(payment["vendor_id"]),
      vendorName: String((payment["qr_vendors"] as Row | null)?.["name"] ?? "Vendor"), amount: Number(payment["amount"]),
      paidOn: String(payment["paid_on"]), reference: payment["reference"] ? String(payment["reference"]) : null,
      note: payment["note"] ? String(payment["note"]) : null, linked: Boolean(payment["linked_ledger_id"]),
      recordedBy: String(payment["created_by_name"]), recordedByEmail: String(payment["created_by_email"]), createdAt: String(payment["created_at"]),
    })),
    paymentTotal: count ?? 0,
    filteredAmount: (filteredRows ?? []).reduce((sum, row) => sum + Number(row.amount ?? 0), 0),
    cashThisMonth: (cashRows ?? []).reduce((sum, row) => sum + Number(row.amount ?? 0), 0),
    canManageVendors: actor.role === "super_admin",
  };
});

export const saveVendor = createServerFn({ method: "POST" })
  .inputValidator((data: { id?: string; name: string; active?: boolean }) => ({
    id: text(data?.id, 40), name: text(data?.name, 120), active: data?.active !== false,
  }))
  .handler(async ({ data }) => {
    const { sb, actor, logAudit } = await vendorAdmin(true);
    if (data.name.length < 2) return { ok: false as const, error: "Enter the vendor name." };
    const patch = { name: data.name, active: data.active };
    if (data.id) {
      const { error } = await sb.from("qr_vendors").update(patch as never).eq("id", data.id);
      if (error) return { ok: false as const, error: error.message };
      await logAudit(sb as never, actor, "vendor.updated", "qr_vendors", data.id, patch);
      return { ok: true as const, id: data.id };
    }
    const { data: created, error } = await sb.from("qr_vendors").insert(patch as never).select("id").single();
    if (error || !created) return { ok: false as const, error: error?.message ?? "Could not add the vendor." };
    await logAudit(sb as never, actor, "vendor.created", "qr_vendors", created.id, patch);
    return { ok: true as const, id: String(created.id) };
  });

export const recordStandaloneVendorPayment = createServerFn({ method: "POST" })
  .inputValidator((data: { vendorId: string; amount: number; paidOn?: string; reference?: string; note?: string }) => ({
    vendorId: text(data?.vendorId, 40), amount: Math.round((Number(data?.amount) || 0) * 100) / 100,
    paidOn: /^\d{4}-\d{2}-\d{2}$/.test(String(data?.paidOn)) ? String(data.paidOn) : new Date().toISOString().slice(0, 10),
    reference: text(data?.reference, 160), note: text(data?.note, 400),
  }))
  .handler(async ({ data }) => {
    const { sb, actor, logAudit } = await vendorAdmin();
    if (data.amount <= 0) return { ok: false as const, error: "Enter an amount greater than zero." };
    const { data: id, error } = await sb.rpc("record_vendor_payment", {
      p_vendor_id: data.vendorId, p_amount: data.amount, p_paid_on: data.paidOn, p_reference: data.reference,
      p_note: data.note, p_actor_id: actor.userId, p_actor_name: actor.name, p_actor_email: actor.email,
    });
    if (error) return { ok: false as const, error: error.message };
    await logAudit(sb as never, actor, "vendor.payment.recorded", "vendor_payments", String(id), data);
    return { ok: true as const };
  });