/** Order notifications: WhatsApp to the owner and to the customer. */
import { BUSINESS, statusLabel } from "@/lib/catalog";

type Row = Record<string, any>;

const rs = (n: number) => `Rs ${Math.round(Number(n) || 0).toLocaleString("en-IN")}`;

export async function loadOrderForNotice(orderId: string): Promise<Row | null> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("orders")
    .select(
      "id, human_id, public_token, status, total, tax_amount, payment_method, payment_status, shipping_method, address, contact_phone, courier_name, tracking_number, tracking_url, order_items(name_snapshot, qty, price_snapshot)",
    )
    .eq("id", orderId)
    .maybeSingle();
  return (data as Row) ?? null;
}

export async function notifySettings(): Promise<{ ownerPhone: string; ownerEmail: string | null; enabled: boolean; lowStock: number }> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("shop_settings")
    .select("owner_whatsapp, owner_email, notify_enabled, low_stock_threshold")
    .maybeSingle();
  return {
    ownerPhone: String(data?.owner_whatsapp ?? BUSINESS.phone),
    ownerEmail: data?.owner_email ?? null,
    enabled: data?.notify_enabled ?? true,
    lowStock: Number(data?.low_stock_threshold ?? 3),
  };
}

const orderLink = (o: Row) => `${BUSINESS.site}/order/${o['id']}?t=${o['public_token']}`;

const itemLines = (o: Row) =>
  ((o['order_items'] ?? []) as Row[])
    .map((i) => `• ${i['name_snapshot']} × ${i['qty']}${i['price_snapshot'] ? ` — ${rs(Number(i['price_snapshot']) * Number(i['qty']))}` : ""}`)
    .join("\n");

const addressLines = (o: Row) => {
  const a = (o['address'] ?? {}) as Record<string, string>;
  return [a['line1'], a['landmark'], `${a['city'] ?? ""}, ${a['state'] ?? ""} – ${a['pincode'] ?? ""}`]
    .filter(Boolean)
    .join("\n");
};

const customerPhone = (o: Row) => String(o['contact_phone'] ?? (o['address'] ?? {})['phone'] ?? "");

/** New order: full details to the owner, a confirmation to the customer. */
export async function notifyOrderPlaced(orderId: string): Promise<void> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: already } = await supabaseAdmin
    .from("notifications")
    .select("id")
    .eq("order_id", orderId)
    .eq("kind", "order.placed.owner")
    .maybeSingle();
  if (already) return;
  const o = await loadOrderForNotice(orderId);
  if (!o) return;
  const s = await notifySettings();
  if (!s.enabled) return;
  const { sendWhatsAppText } = await import("@/lib/whatsapp.server");
  const a = (o['address'] ?? {}) as Record<string, string>;
  const paid = o['payment_status'] === "paid" ? "Paid online" : o['payment_status'] === "cod_pending" ? "Cash on delivery" : "Payment pending";

  const owner = [
    `🛒 New order ${o['human_id']}`,
    "",
    itemLines(o),
    "",
    `Total: ${rs(o['total'])} (${paid})`,
    `Delivery: ${o['shipping_method'] ?? "-"}`,
    "",
    `Customer: ${a['name'] ?? "-"}`,
    `Phone: ${customerPhone(o)}`,
    addressLines(o),
    "",
    orderLink(o),
  ].join("\n");

  const customer = [
    `Hi ${a['name'] ?? "there"}, thank you for your order with ${BUSINESS.name}.`,
    "",
    `Order ${o['human_id']}`,
    itemLines(o),
    `Total: ${rs(o['total'])} (${paid})`,
    "",
    `Track your order here: ${orderLink(o)}`,
    `Questions? Just reply to this message or call ${BUSINESS.phone}.`,
  ].join("\n");

  await Promise.all([
    sendWhatsAppText({ to: s.ownerPhone, body: owner, kind: "order.placed.owner", orderId }),
    sendWhatsAppText({ to: customerPhone(o), body: customer, kind: "order.placed.customer", orderId }),
  ]);
}

/** Every status change tells the customer what happened. */
export async function notifyOrderStatus(orderId: string, status: string, note?: string | null): Promise<void> {
  const o = await loadOrderForNotice(orderId);
  if (!o) return;
  const s = await notifySettings();
  if (!s.enabled) return;
  const { sendWhatsAppText } = await import("@/lib/whatsapp.server");

  const lines = [`Order ${o['human_id']} update: ${statusLabel(status)}.`];
  if (status === "shipped" && o['tracking_number']) {
    lines.push(`Courier: ${o['courier_name'] ?? "-"} · Tracking no: ${o['tracking_number']}`);
    if (o['tracking_url']) lines.push(`Track with the courier: ${o['tracking_url']}`);
  }
  if (note) lines.push(note);
  lines.push("", `Order details: ${orderLink(o)}`);

  await sendWhatsAppText({
    to: customerPhone(o),
    body: lines.join("\n"),
    kind: `order.status.${status}`,
    orderId,
  });
}

/** Customer asked to cancel or return — tell the owner. */
export async function notifyOrderRequest(orderId: string, kind: "cancellation" | "return", reason: string, details?: string): Promise<void> {
  const o = await loadOrderForNotice(orderId);
  if (!o) return;
  const s = await notifySettings();
  const { sendWhatsAppText } = await import("@/lib/whatsapp.server");
  const a = (o['address'] ?? {}) as Record<string, string>;
  const body = [
    kind === "cancellation" ? `⚠️ Cancellation request for ${o['human_id']}` : `↩️ Return request for ${o['human_id']}`,
    `Reason: ${reason}`,
    details ? `Note: ${details}` : "",
    `Customer: ${a['name'] ?? "-"} · ${customerPhone(o)}`,
    `Total: ${rs(o['total'])}`,
    "",
    orderLink(o),
  ]
    .filter(Boolean)
    .join("\n");
  await sendWhatsAppText({ to: s.ownerPhone, body, kind: `order.${kind}.requested`, orderId });
  await sendWhatsAppText({
    to: customerPhone(o),
    body: `We have received your ${kind === "cancellation" ? "cancellation" : "return"} request for order ${o['human_id']} (${reason}). Our team will confirm shortly.`,
    kind: `order.${kind}.ack`,
    orderId,
  });
}

/** Owner decided on a request. */
export async function notifyRequestDecision(
  orderId: string,
  kind: string,
  approved: boolean,
  note?: string | null,
): Promise<void> {
  const o = await loadOrderForNotice(orderId);
  if (!o) return;
  const { sendWhatsAppText } = await import("@/lib/whatsapp.server");
  const body = [
    `Your ${kind} request for order ${o['human_id']} has been ${approved ? "approved" : "declined"}.`,
    note ?? "",
    "",
    orderLink(o),
  ]
    .filter(Boolean)
    .join("\n");
  await sendWhatsAppText({ to: customerPhone(o), body, kind: `order.${kind}.${approved ? "approved" : "rejected"}`, orderId });
}

/** A refund was recorded against the payment. */
export async function notifyRefund(orderId: string, amount: number, method: string): Promise<void> {
  const o = await loadOrderForNotice(orderId);
  if (!o) return;
  const { sendWhatsAppText } = await import("@/lib/whatsapp.server");
  await sendWhatsAppText({
    to: customerPhone(o),
    body: `A refund of ${rs(amount)} for order ${o['human_id']} has been processed (${method}). Bank refunds usually take 3–7 working days to show up.\n\n${orderLink(o)}`,
    kind: "order.refunded",
    orderId,
  });
}

/** Orders received, revenue and low-stock items for a given day (IST). */
export async function buildDailySummary(day: Date): Promise<{ day: string; orders: number; revenue: number; lowStockCount: number; body: string }> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const s = await notifySettings();

  // Day boundaries in IST (UTC+5:30)
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istDay = new Date(day.getTime() + istOffset);
  const dayStr = istDay.toISOString().slice(0, 10);
  const start = new Date(Date.parse(`${dayStr}T00:00:00.000Z`) - istOffset).toISOString();
  const end = new Date(Date.parse(`${dayStr}T00:00:00.000Z`) - istOffset + 24 * 60 * 60 * 1000).toISOString();

  const [{ data: orders }, { data: low }] = await Promise.all([
    supabaseAdmin
      .from("orders")
      .select("human_id, total, status, payment_status, address")
      .gte("placed_at", start)
      .lt("placed_at", end),
    supabaseAdmin
      .from("products")
      .select("name, stock")
      .eq("status", "visible")
      .gt("stock", 0)
      .lte("stock", s.lowStock)
      .order("stock")
      .limit(15),
  ]);

  const rows = (orders ?? []) as Row[];
  const live = rows.filter((o) => o['status'] !== "cancelled");
  const revenue = live.reduce((n, o) => n + Number(o['total'] ?? 0), 0);
  const lowList = (low ?? []) as Row[];

  const body = [
    `📊 ${BUSINESS.name} — ${new Date(`${dayStr}T00:00:00Z`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`,
    "",
    `Orders received: ${rows.length}`,
    `Revenue: ${rs(revenue)}`,
    rows.length ? "" : "No orders today.",
    ...live.slice(0, 10).map((o) => `• ${o['human_id']} — ${rs(o['total'])} (${(o['address'] ?? {})['name'] ?? "Customer"})`),
    "",
    lowList.length ? `Low on stock (${lowList.length}):` : "Nothing is low on stock.",
    ...lowList.map((p) => `• ${p['name']} — ${p['stock']} left`),
  ]
    .filter((l) => l !== undefined)
    .join("\n");

  return { day: dayStr, orders: rows.length, revenue, lowStockCount: lowList.length, body };
}

/** Send the daily summary to the owner; safe to call twice for the same day. */
export async function sendDailySummary(day = new Date(), force = false): Promise<{ sent: boolean; day: string; body: string }> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const summary = await buildDailySummary(day);
  if (!force) {
    const { data: existing } = await supabaseAdmin.from("daily_summaries").select("day").eq("day", summary.day).maybeSingle();
    if (existing) return { sent: false, day: summary.day, body: summary.body };
  }
  const s = await notifySettings();
  const { sendWhatsAppText } = await import("@/lib/whatsapp.server");
  await sendWhatsAppText({ to: s.ownerPhone, body: summary.body, kind: "daily.summary" });
  await supabaseAdmin.from("daily_summaries").upsert({
    day: summary.day,
    orders: summary.orders,
    revenue: summary.revenue,
    low_stock: summary.lowStockCount,
    body: summary.body,
    sent_at: new Date().toISOString(),
  } as never);
  return { sent: true, day: summary.day, body: summary.body };
}
