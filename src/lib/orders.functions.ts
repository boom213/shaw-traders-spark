import { createServerFn } from "@tanstack/react-start";
import type { OrderStatus, OrderView } from "@/lib/catalog";

const ORDER_SELECT =
  "id, human_id, public_token, status, subtotal, shipping_fee, discount, total, tax_amount, gst_rate, gst_included, gstin, payment_method, payment_status, shipping_method, address, placed_at, updated_at, profile_id, contact_phone, courier_name, tracking_number, tracking_url, order_items(id, product_id, name_snapshot, price_snapshot, qty, image_snapshot), order_events(status, note, created_at), order_requests(id, kind, reason, details, status, decision_note, created_at), refunds(id, amount, method, created_at)";

type Row = Record<string, any>;

function mapOrder(row: Row): OrderView {
  return {
    id: String(row['id']),
    humanId: String(row['human_id']),
    token: String(row['public_token']),
    status: row['status'] as OrderStatus,
    subtotal: Number(row['subtotal']),
    shippingFee: Number(row['shipping_fee']),
    discount: Number(row['discount']),
    total: Number(row['total']),
    taxAmount: Number(row['tax_amount'] ?? 0),
    gstRate: Number(row['gst_rate'] ?? 0),
    gstIncluded: Boolean(row['gst_included']),
    gstin: row['gstin'] ?? null,
    paymentMethod: row['payment_method'] ?? null,
    paymentStatus: String(row['payment_status']),
    shippingMethod: row['shipping_method'] ?? null,
    address: (row['address'] ?? {}) as Record<string, string>,
    courierName: row['courier_name'] ?? null,
    trackingNumber: row['tracking_number'] ?? null,
    trackingUrl: row['tracking_url'] ?? null,
    requests: ((row['order_requests'] ?? []) as Row[]).map((r) => ({
      id: String(r['id']),
      kind: String(r['kind']) as 'cancellation' | 'return',
      reason: String(r['reason']),
      details: r['details'] ?? null,
      status: String(r['status']) as 'pending' | 'approved' | 'rejected',
      decisionNote: r['decision_note'] ?? null,
      createdAt: String(r['created_at']),
    })),
    refunds: ((row['refunds'] ?? []) as Row[]).map((r) => ({
      id: String(r['id']),
      amount: Number(r['amount']),
      method: String(r['method']),
      createdAt: String(r['created_at']),
    })),
    placedAt: String(row['placed_at']),
    updatedAt: String(row['updated_at']),
    items: ((row['order_items'] ?? []) as Row[]).map((i) => ({
      id: String(i['id']),
      productId: i['product_id'] ?? null,
      name: String(i['name_snapshot']),
      price: i['price_snapshot'] === null || i['price_snapshot'] === undefined ? null : Number(i['price_snapshot']),
      qty: Number(i['qty']),
      image: i['image_snapshot'] ?? null,
    })),
    events: ((row['order_events'] ?? []) as Row[])
      .map((e) => ({ status: e['status'] as OrderStatus, note: e['note'] ?? null, createdAt: String(e['created_at']) }))
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
  };
}

const last4 = (v: unknown) => String(v ?? "").replace(/\D/g, "").slice(-4);

export type OrderLookup =
  | { state: "ok"; order: OrderView }
  | { state: "verify"; phoneHint: string }
  | { state: "notfound" };

/**
 * Looks an order up by its unguessable link token. Access is granted to the
 * signed-in customer who owns it, to staff, or to a guest who proves the phone
 * number on the order by its last four digits.
 */
export const getOrder = createServerFn({ method: "POST" })
  .inputValidator((data: { token: string; phoneLast4?: string }) => ({
    token: String(data?.token ?? ""),
    phoneLast4: String(data?.phoneLast4 ?? "").replace(/\D/g, "").slice(-4),
  }))
  .handler(async ({ data }): Promise<OrderLookup> => {
    if (!/^[0-9a-f-]{36}$/i.test(data.token)) return { state: "notfound" };
    const { releaseStaleOrdersSoon } = await import("@/lib/order-cleanup.server");
    await releaseStaleOrdersSoon();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("orders")
      .select(ORDER_SELECT)
      .eq("public_token", data.token)
      .maybeSingle();
    if (!row) return { state: "notfound" };

    const { staffContext } = await import("@/lib/staff.server");
    if (await staffContext()) return { state: "ok", order: mapOrder(row) };

    const { currentUserId } = await import("@/lib/auth.server");
    const userId = await currentUserId();
    if (userId && row.profile_id === userId) return { state: "ok", order: mapOrder(row) };

    const phone = String(row.contact_phone ?? (row.address as Record<string, string>)?.['phone'] ?? "");
    const digits = phone.replace(/\D/g, "");
    if (data.phoneLast4 && digits.length >= 4 && digits.slice(-4) === data.phoneLast4) {
      return { state: "ok", order: mapOrder(row) };
    }
    return { state: "verify", phoneHint: digits ? `••••••${digits.slice(-2)}` : "your phone number" };
  });

/**
 * Track page: order number plus the full phone number used on the order.
 * Signed-in owners and staff may skip the phone check. The last four digits
 * alone were too easy to guess, so guests must prove the whole number.
 */
export const findOrder = createServerFn({ method: "POST" })
  .inputValidator((data: { humanId: string; phone: string }) => ({
    humanId: String(data?.humanId ?? "").trim().toUpperCase().slice(0, 40),
    phone: String(data?.phone ?? "").replace(/\D/g, "").slice(-10),
  }))
  .handler(async ({ data }): Promise<{ id: string; token: string } | { error: string }> => {
    if (!data.humanId) return { error: "Enter your order number and the phone number used on the order." };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("orders")
      .select("id, public_token, contact_phone, address, profile_id")
      .eq("human_id", data.humanId)
      .maybeSingle();

    const { currentUserId } = await import("@/lib/auth.server");
    const userId = await currentUserId();
    if (row && userId && row.profile_id === userId) return { id: String(row.id), token: String(row.public_token) };
    if (row && userId) {
      const { staffContext } = await import("@/lib/staff.server");
      if (await staffContext()) return { id: String(row.id), token: String(row.public_token) };
    }

    // Orders tied to an account are only opened by that signed-in customer (or staff), never by phone match.
    if (row && row.profile_id) {
      return { error: userId ? "We couldn't find an order with that number and phone. Check both and try again." : "Sign in to the account used for this order to track it." };
    }
    if (data.phone.length !== 10) return { error: "Enter your order number and the full 10-digit phone number used on the order." };
    const digits = String(row?.contact_phone ?? (row?.address as Record<string, string> | undefined)?.['phone'] ?? "").replace(/\D/g, "").slice(-10);
    // Same reply for a wrong number or an unknown order, so neither can be probed separately.
    if (!row || digits.length !== 10 || digits !== data.phone) {
      return { error: "We couldn't find an order with that number and phone. Check both and try again." };
    }
    return { id: String(row.id), token: String(row.public_token) };
  });

/** Orders belonging to the signed-in customer, newest first. */
export const myOrders = createServerFn({ method: "GET" }).handler(async (): Promise<OrderView[]> => {
  const { currentUserId } = await import("@/lib/auth.server");
  const userId = await currentUserId();
  if (!userId) return [];
  const { releaseStaleOrdersSoon } = await import("@/lib/order-cleanup.server");
  await releaseStaleOrdersSoon();
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: rows } = await supabaseAdmin
    .from("orders")
    .select(ORDER_SELECT)
    .eq("profile_id", userId)
    .order("placed_at", { ascending: false })
    .limit(50);
  return (rows ?? []).map(mapOrder);
});
