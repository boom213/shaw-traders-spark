import { createServerFn } from "@tanstack/react-start";
import type { OrderStatus, OrderView } from "@/lib/catalog";

const ORDER_SELECT =
  "id, human_id, public_token, status, subtotal, shipping_fee, discount, total, payment_method, payment_status, shipping_method, address, placed_at, updated_at, profile_id, contact_phone, order_items(id, product_id, name_snapshot, price_snapshot, qty, image_snapshot), order_events(status, note, created_at)";

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
    paymentMethod: row['payment_method'] ?? null,
    paymentStatus: String(row['payment_status']),
    shippingMethod: row['shipping_method'] ?? null,
    address: (row['address'] ?? {}) as Record<string, string>,
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
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("orders")
      .select(ORDER_SELECT)
      .eq("public_token", data.token)
      .maybeSingle();
    if (!row) return { state: "notfound" };

    const { managerUnlocked } = await import("@/lib/manage-session.server");
    if (await managerUnlocked()) return { state: "ok", order: mapOrder(row) };

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

/** Track page: order number plus the last four digits of the phone used. */
export const findOrder = createServerFn({ method: "POST" })
  .inputValidator((data: { humanId: string; phoneLast4: string }) => ({
    humanId: String(data?.humanId ?? "").trim().toUpperCase(),
    phoneLast4: last4(data?.phoneLast4),
  }))
  .handler(async ({ data }): Promise<{ id: string; token: string } | { error: string }> => {
    if (!data.humanId || data.phoneLast4.length !== 4) {
      return { error: "Enter your order number and the last 4 digits of your phone number." };
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("orders")
      .select("id, public_token, contact_phone, address")
      .eq("human_id", data.humanId)
      .maybeSingle();
    if (!row) return { error: "No order found with that number." };
    const digits = String(row.contact_phone ?? (row.address as Record<string, string>)?.['phone'] ?? "").replace(/\D/g, "");
    if (digits.slice(-4) !== data.phoneLast4) return { error: "That phone number does not match this order." };
    return { id: String(row.id), token: String(row.public_token) };
  });

/** Orders belonging to the signed-in customer, newest first. */
export const myOrders = createServerFn({ method: "GET" }).handler(async (): Promise<OrderView[]> => {
  const { currentUserId } = await import("@/lib/auth.server");
  const userId = await currentUserId();
  if (!userId) return [];
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: rows } = await supabaseAdmin
    .from("orders")
    .select(ORDER_SELECT)
    .eq("profile_id", userId)
    .order("placed_at", { ascending: false })
    .limit(50);
  return (rows ?? []).map(mapOrder);
});
