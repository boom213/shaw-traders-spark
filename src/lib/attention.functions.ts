import { createServerFn } from "@tanstack/react-start";

type Row = Record<string, any>;

export type AttentionItem = { key: string; label: string; count: number; to: string };
export type Attention = { items: AttentionItem[]; total: number };

/**
 * The daily "needs attention" list: everything waiting on a person at the shop.
 */
export async function needsAttentionData(): Promise<Attention> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const sb = supabaseAdmin;

  const [enquiries, applications, orders, products] = await Promise.all([
    sb.from("product_enquiries").select("id", { count: "exact", head: true }).eq("status", "new"),
    sb.from("trade_applications").select("id", { count: "exact", head: true }).in("status", ["pending", "more_info_needed"]),
    sb.from("orders").select("id", { count: "exact", head: true }).in("status", ["order_confirmed", "processing", "packed"]),
    sb.rpc("manager_product_attention_counts"),
  ]);

  const counts = (products.data ?? {}) as Row;
  const belowThreshold = Number(counts['belowThreshold'] ?? 0);
  const noPhoto = Number(counts['noPhoto'] ?? 0);
  const noPrice = Number(counts['noPrice'] ?? 0);

  const items: AttentionItem[] = [
    { key: "enquiries", label: "Availability asks not answered", count: enquiries.count ?? 0, to: "/manage/enquiries" },
    { key: "trade", label: "Wholesale applications waiting", count: applications.count ?? 0, to: "/manage/trade" },
    { key: "orders", label: "Orders not dispatched", count: orders.count ?? 0, to: "/manage/orders" },
    { key: "stock", label: "Parts running low", count: belowThreshold, to: "/manage/catalogue" },
    { key: "photo", label: "Parts with no photo", count: noPhoto, to: "/manage/catalogue" },
    { key: "price", label: "Parts with no price", count: noPrice, to: "/manage/catalogue" },
  ].filter((i) => i.count > 0);

  return { items, total: items.reduce((n, i) => n + i.count, 0) };
}

/** Manager panel view of the same list. */
export const needsAttention = createServerFn({ method: "POST" }).handler(async (): Promise<Attention> => {
  const { requireStaff } = await import("@/lib/staff.server");
  await requireStaff();
  return needsAttentionData();
});
