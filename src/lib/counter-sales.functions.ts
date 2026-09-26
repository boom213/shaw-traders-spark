import { createServerFn } from "@tanstack/react-start";

type Row = Record<string, any>;

export type CounterCustomer = {
  id: string;
  name: string;
  email: string;
  phone: string;
  priceTier: "trade" | "distributor";
  creditLimit: number;
  paymentTermsDays: number;
  balance: number;
  overdue: boolean;
  address: Record<string, string> | null;
};

export type CounterProduct = {
  id: string;
  sku: string;
  name: string;
  stock: number;
  retailPrice: number | null;
  wholesalePrice: number | null;
  image: string | null;
  rackLocation: string | null;
};

export type CounterSale = {
  orderId: string;
  humanId: string;
  token: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  invoiceKind: "gst" | "non_gst";
  total: number;
  tax: number;
  paid: number;
  balance: number;
  paymentStatus: string;
  createdAt: string;
  createdBy: string;
  createdByEmail: string;
  dueDate: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
  note: string | null;
  overrideReason: string | null;
  items: Array<{ name: string; sku: string; qty: number; price: number; image: string | null }>;
  payments: Array<{ id: string; amount: number; method: string; reference: string | null; note: string | null; receivedOn: string; recordedBy: string }>;
};

async function counterAdmin() {
  const { requireStaff, logAudit } = await import("@/lib/staff.server");
  const actor = await requireStaff({ manager: true });
  const { supabaseAdmin: sb } = await import("@/integrations/supabase/client.server");
  return { sb, actor, logAudit };
}

export const counterSaleSetup = createServerFn({ method: "POST" }).handler(async (): Promise<{
  customers: CounterCustomer[];
  gst: { enabled: boolean; rate: number; included: boolean; gstin: string };
}> => {
  const { sb } = await counterAdmin();
  const [{ data: profiles, error: profileError }, { data: addresses }, { data: ledger }, { data: settings }] = await Promise.all([
    sb.from("profiles").select("id, full_name, email, phone, price_tier, credit_limit, payment_terms_days").eq("customer_type", "trade").not("trade_approved_at", "is", null).order("full_name").limit(1000),
    sb.from("addresses").select("profile_id, name, phone, line1, landmark, city, state, pincode, is_default, created_at").order("is_default", { ascending: false }).order("created_at", { ascending: false }).limit(3000),
    sb.from("trade_ledger").select("profile_id, kind, amount, due_date, settled").limit(10000),
    sb.from("shop_settings").select("gst_enabled, gst_rate, prices_include_gst, gstin").maybeSingle(),
  ]);
  if (profileError) throw new Error(profileError.message);
  const addressByProfile = new Map<string, Record<string, string>>();
  for (const address of (addresses ?? []) as Row[]) {
    const id = String(address['profile_id']);
    if (!addressByProfile.has(id)) {
      addressByProfile.set(id, Object.fromEntries(Object.entries(address).filter(([key, value]) => !["profile_id", "created_at", "is_default"].includes(key) && value != null)) as Record<string, string>);
    }
  }
  const ledgerByProfile = new Map<string, Row[]>();
  for (const entry of (ledger ?? []) as Row[]) {
    const id = String(entry['profile_id']);
    ledgerByProfile.set(id, [...(ledgerByProfile.get(id) ?? []), entry]);
  }
  const today = new Date().toISOString().slice(0, 10);
  return {
    customers: ((profiles ?? []) as Row[]).map((profile) => {
      const entries = ledgerByProfile.get(String(profile['id'])) ?? [];
      return {
        id: String(profile['id']),
        name: String(profile['full_name'] ?? profile['email'] ?? "Wholesale customer"),
        email: String(profile['email'] ?? ""),
        phone: String(profile['phone'] ?? ""),
        priceTier: profile['price_tier'] === "distributor" ? "distributor" : "trade",
        creditLimit: Number(profile['credit_limit'] ?? 0),
        paymentTermsDays: Number(profile['payment_terms_days'] ?? 0),
        balance: entries.reduce((sum, entry) => sum + (entry['kind'] === "payment" ? -Number(entry['amount']) : Number(entry['amount'])), 0),
        overdue: entries.some((entry) => entry['kind'] === "invoice" && !entry['settled'] && entry['due_date'] && String(entry['due_date']) < today),
        address: addressByProfile.get(String(profile['id'])) ?? null,
      };
    }),
    gst: { enabled: Boolean(settings?.gst_enabled), rate: Number(settings?.gst_rate ?? 0), included: Boolean(settings?.prices_include_gst), gstin: String(settings?.gstin ?? "") },
  };
});

export const searchCounterProducts = createServerFn({ method: "POST" })
  .inputValidator((data: { q?: string; customerId?: string }) => ({ q: String(data?.q ?? "").trim().slice(0, 120), customerId: String(data?.customerId ?? "") }))
  .handler(async ({ data }): Promise<CounterProduct[]> => {
    const { sb } = await counterAdmin();
    const { data: customer } = await sb.from("profiles").select("price_tier, customer_type, trade_approved_at").eq("id", data.customerId).maybeSingle();
    if (!customer || customer.customer_type !== "trade" || !customer.trade_approved_at) return [];
    let query = sb.from("products").select("id, sku, name, price, stock, rack_location, product_images(url, sort_order), price_tiers(tier, price, min_qty)").eq("status", "visible").gt("stock", 0);
    if (data.q) {
      const term = data.q.replace(/[%,()]/g, " ");
      query = query.or(`name.ilike.%${term}%,sku.ilike.%${term}%,brand.ilike.%${term}%,model.ilike.%${term}%,rack_location.ilike.%${term}%`);
    }
    const { data: rows, error } = await query.order("name").limit(30);
    if (error) throw new Error(error.message);
    return ((rows ?? []) as Row[]).map((row) => {
      const tiers = ((row['price_tiers'] ?? []) as Row[]).filter((tier) => tier['tier'] === customer.price_tier).sort((a, b) => Number(a['min_qty']) - Number(b['min_qty']));
      const images = ((row['product_images'] ?? []) as Row[]).sort((a, b) => Number(a['sort_order']) - Number(b['sort_order']));
      return { id: String(row['id']), sku: String(row['sku']), name: String(row['name']), stock: Number(row['stock']), retailPrice: row['price'] == null ? null : Number(row['price']), wholesalePrice: tiers[0]?.['price'] == null ? (row['price'] == null ? null : Number(row['price'])) : Number(tiers[0]['price']), image: images[0]?.['url'] ? String(images[0]['url']) : null, rackLocation: row['rack_location'] ? String(row['rack_location']) : null };
    });
  });

export const listCounterSales = createServerFn({ method: "POST" })
  .inputValidator((data: { q?: string } | undefined) => ({ q: String(data?.q ?? "").trim().toLowerCase().slice(0, 120) }))
  .handler(async ({ data }): Promise<CounterSale[]> => {
    const { sb } = await counterAdmin();
    const { data: rows, error } = await sb.from("counter_sales").select("order_id, profile_id, invoice_kind, price_override_reason, note, created_by_name, created_by_email, cancelled_at, cancel_reason, created_at").order("created_at", { ascending: false }).limit(300);
    if (error) throw new Error(error.message);
    const orderIds = ((rows ?? []) as Row[]).map((row) => String(row['order_id']));
    const profileIds = [...new Set(((rows ?? []) as Row[]).map((row) => String(row['profile_id'])))];
    if (orderIds.length === 0) return [];
    const [{ data: orders }, { data: profiles }, { data: items }, { data: payments }] = await Promise.all([
      sb.from("orders").select("id, human_id, public_token, total, tax_amount, payment_status, credit_due_date").in("id", orderIds),
      sb.from("profiles").select("id, full_name, phone").in("id", profileIds),
      sb.from("order_items").select("order_id, name_snapshot, qty, price_snapshot, image_snapshot, products(sku)").in("order_id", orderIds),
      sb.from("counter_sale_payments").select("id, order_id, amount, method, reference, note, received_on, recorded_by_name, created_at").in("order_id", orderIds),
    ]);
    const orderMap = new Map(((orders ?? []) as Row[]).map((item) => [String(item['id']), item]));
    const profileMap = new Map(((profiles ?? []) as Row[]).map((item) => [String(item['id']), item]));
    const itemsMap = new Map<string, Row[]>();
    for (const item of (items ?? []) as Row[]) itemsMap.set(String(item['order_id']), [...(itemsMap.get(String(item['order_id'])) ?? []), item]);
    const paymentsMap = new Map<string, Row[]>();
    for (const payment of (payments ?? []) as Row[]) paymentsMap.set(String(payment['order_id']), [...(paymentsMap.get(String(payment['order_id'])) ?? []), payment]);
    const mapped = ((rows ?? []) as Row[]).map((row): CounterSale => {
      const order = orderMap.get(String(row['order_id'])) ?? {};
      const profile = profileMap.get(String(row['profile_id'])) ?? {};
      const saleItems = itemsMap.get(String(row['order_id'])) ?? [];
      const payments = (paymentsMap.get(String(row['order_id'])) ?? []).sort((a, b) => String(b['created_at']).localeCompare(String(a['created_at'])));
      const total = Number(order?.['total'] ?? 0);
      const paid = payments.reduce((sum, payment) => sum + Number(payment['amount'] ?? 0), 0);
      return {
        orderId: String(row['order_id']), humanId: String(order?.['human_id'] ?? ""), token: String(order?.['public_token'] ?? ""), customerId: String(row['profile_id']), customerName: String(profile?.['full_name'] ?? "Wholesale customer"), customerPhone: String(profile?.['phone'] ?? ""), invoiceKind: row['invoice_kind'] === "gst" ? "gst" : "non_gst", total, tax: Number(order?.['tax_amount'] ?? 0), paid, balance: Math.max(0, total - paid), paymentStatus: String(order?.['payment_status'] ?? "cod_pending"), createdAt: String(row['created_at']), createdBy: String(row['created_by_name']), createdByEmail: String(row['created_by_email'] ?? ""), dueDate: order?.['credit_due_date'] ? String(order['credit_due_date']) : null, cancelledAt: row['cancelled_at'] ? String(row['cancelled_at']) : null, cancelReason: row['cancel_reason'] ?? null, note: row['note'] ?? null, overrideReason: row['price_override_reason'] ?? null,
        items: saleItems.map((item) => ({ name: String(item['name_snapshot']), sku: String((item['products'] as Row | null)?.['sku'] ?? ""), qty: Number(item['qty']), price: Number(item['price_snapshot'] ?? 0), image: item['image_snapshot'] ? String(item['image_snapshot']) : null })),
        payments: payments.map((payment) => ({ id: String(payment['id']), amount: Number(payment['amount']), method: String(payment['method']), reference: payment['reference'] ?? null, note: payment['note'] ?? null, receivedOn: String(payment['received_on']), recordedBy: String(payment['recorded_by_name']) })),
      };
    });
    return data.q ? mapped.filter((sale) => `${sale.humanId} ${sale.customerName} ${sale.customerPhone}`.toLowerCase().includes(data.q)) : mapped;
  });

export const createCounterSale = createServerFn({ method: "POST" })
  .inputValidator((data: { customerId: string; invoiceKind: string; overrideReason?: string; note?: string; items: Array<{ productId: string; qty: number; unitPrice: number }> }) => ({ customerId: String(data?.customerId ?? ""), invoiceKind: data?.invoiceKind === "gst" ? "gst" : "non_gst", overrideReason: String(data?.overrideReason ?? "").trim().slice(0, 300), note: String(data?.note ?? "").trim().slice(0, 500), items: (data?.items ?? []).slice(0, 100).map((item) => ({ product_id: String(item.productId), qty: Math.max(1, Math.floor(Number(item.qty) || 1)), unit_price: Math.round((Number(item.unitPrice) || 0) * 100) / 100 })) }))
  .handler(async ({ data }) => {
    const { sb, actor, logAudit } = await counterAdmin();
    const { data: created, error } = await sb.rpc("create_counter_sale", { p_profile_id: data.customerId, p_items: data.items, p_invoice_kind: data.invoiceKind, p_override_reason: data.overrideReason, p_note: data.note, p_actor_id: actor.userId, p_actor_name: actor.name, p_actor_email: actor.email });
    if (error) return { ok: false as const, error: error.message };
    const sale = Array.isArray(created) ? created[0] : created;
    if (!sale) return { ok: false as const, error: "The sale could not be created." };
    await logAudit(sb as never, actor, "counter_sale.created", "orders", String(sale.order_id), { customerId: data.customerId, invoiceKind: data.invoiceKind, items: data.items, overrideReason: data.overrideReason, total: sale.total });
    return { ok: true as const, orderId: String(sale.order_id), humanId: String(sale.human_id), token: String(sale.public_token), total: Number(sale.total) };
  });

export const recordCounterPayment = createServerFn({ method: "POST" })
  .inputValidator((data: { orderId: string; amount: number; method: string; reference?: string; note?: string; receivedOn?: string }) => ({ orderId: String(data?.orderId ?? ""), amount: Math.round((Number(data?.amount) || 0) * 100) / 100, method: String(data?.method ?? "").trim().slice(0, 60), reference: String(data?.reference ?? "").trim().slice(0, 100), note: String(data?.note ?? "").trim().slice(0, 300), receivedOn: /^\d{4}-\d{2}-\d{2}$/.test(String(data?.receivedOn)) ? String(data.receivedOn) : new Date().toISOString().slice(0, 10) }))
  .handler(async ({ data }) => {
    const { sb, actor, logAudit } = await counterAdmin();
    if (!data.method) return { ok: false as const, error: "Choose a payment method." };
    const { data: balance, error } = await sb.rpc("record_counter_sale_payment", { p_order_id: data.orderId, p_amount: data.amount, p_method: data.method, p_reference: data.reference, p_note: data.note, p_received_on: data.receivedOn, p_actor_id: actor.userId, p_actor_name: actor.name });
    if (error) return { ok: false as const, error: error.message };
    await logAudit(sb as never, actor, "counter_sale.payment_recorded", "orders", data.orderId, { amount: data.amount, method: data.method, reference: data.reference, receivedOn: data.receivedOn, balance });
    return { ok: true as const, balance: Number(balance ?? 0) };
  });

export const cancelCounterSale = createServerFn({ method: "POST" })
  .inputValidator((data: { orderId: string; reason: string }) => ({ orderId: String(data?.orderId ?? ""), reason: String(data?.reason ?? "").trim().slice(0, 300) }))
  .handler(async ({ data }) => {
    const { sb, actor, logAudit } = await counterAdmin();
    if (data.reason.length < 3) return { ok: false as const, error: "Add a cancellation reason." };
    const { data: cancelled, error } = await sb.rpc("cancel_counter_sale", { p_order_id: data.orderId, p_reason: data.reason, p_actor_id: actor.userId, p_actor_name: actor.name });
    if (error) return { ok: false as const, error: error.message };
    if (!cancelled) return { ok: false as const, error: "This sale is already cancelled or unavailable." };
    await logAudit(sb as never, actor, "counter_sale.cancelled", "orders", data.orderId, { reason: data.reason });
    return { ok: true as const };
  });

export const counterSaleInvoice = createServerFn({ method: "POST" })
  .inputValidator((data: { orderId: string }) => ({ orderId: String(data?.orderId ?? "") }))
  .handler(async ({ data }) => {
    await counterAdmin();
    const { invoicePdfBase64 } = await import("@/lib/invoice.server");
    return invoicePdfBase64(data.orderId);
  });