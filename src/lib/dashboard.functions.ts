import { createServerFn } from "@tanstack/react-start";

type Row = Record<string, any>;

async function admin() {
  const { requireStaff } = await import("@/lib/staff.server");
  await requireStaff();
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

const IST = 5.5 * 60 * 60 * 1000;
const istMidnight = (daysBack: number) => {
  const now = Date.now() + IST;
  const day = new Date(now);
  day.setUTCHours(0, 0, 0, 0);
  return new Date(day.getTime() - daysBack * 86400000 - IST).toISOString();
};

export type Dashboard = {
  todayOrders: number;
  todayRevenue: number;
  weekRevenue: number;
  monthRevenue: number;
  pendingOrders: number;
  bestSellers: { name: string; qty: number; revenue: number }[];
  noPhoto: number;
  noPrice: number;
  lowStock: { id: string; name: string; stock: number; threshold: number }[];
  emptySearches: { term: string; hits: number }[];
};

export const dashboard = createServerFn({ method: "POST" }).handler(async (): Promise<Dashboard> => {
  const sb = await admin();
  const monthStart = istMidnight(30);

  const [ordersRes, productsRes, missesRes] = await Promise.all([
    sb
      .from("orders")
      .select("id, total, status, placed_at, order_items(name_snapshot, qty, price_snapshot)")
      .gte("placed_at", monthStart)
      .limit(2000),
    sb.from("products").select("id, name, price, stock, reorder_threshold, product_images(url)").eq("is_active", true).limit(3000),
    sb.from("search_misses").select("term, hits").order("hits", { ascending: false }).limit(12),
  ]);

  const orders = (ordersRes.data ?? []) as Row[];
  const products = (productsRes.data ?? []) as Row[];

  const todayFrom = istMidnight(0);
  const weekFrom = istMidnight(7);
  const live = orders.filter((o) => o['status'] !== "cancelled" && o['status'] !== "returned");
  const sum = (rows: Row[]) => rows.reduce((n, o) => n + Number(o['total'] ?? 0), 0);

  const today = live.filter((o) => String(o['placed_at']) >= todayFrom);
  const week = live.filter((o) => String(o['placed_at']) >= weekFrom);

  const sellers = new Map<string, { qty: number; revenue: number }>();
  for (const o of live) {
    for (const i of (o['order_items'] ?? []) as Row[]) {
      const key = String(i['name_snapshot']);
      const prev = sellers.get(key) ?? { qty: 0, revenue: 0 };
      prev.qty += Number(i['qty'] ?? 0);
      prev.revenue += Number(i['price_snapshot'] ?? 0) * Number(i['qty'] ?? 0);
      sellers.set(key, prev);
    }
  }

  const lowStock = products
    .map((p) => ({
      id: String(p['id']),
      name: String(p['name']),
      stock: Number(p['stock'] ?? 0),
      threshold: Number(p['reorder_threshold'] ?? 3),
    }))
    .filter((p) => p.stock <= p.threshold)
    .sort((a, b) => a.stock - b.stock)
    .slice(0, 20);

  return {
    todayOrders: today.length,
    todayRevenue: sum(today),
    weekRevenue: sum(week),
    monthRevenue: sum(live),
    pendingOrders: live.filter((o) => o['status'] === "order_confirmed" || o['status'] === "processing").length,
    bestSellers: [...sellers.entries()]
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 6),
    noPhoto: products.filter((p) => ((p['product_images'] ?? []) as Row[]).length === 0).length,
    noPrice: products.filter((p) => p['price'] === null).length,
    lowStock,
    emptySearches: ((missesRes.data ?? []) as Row[]).map((m) => ({ term: String(m['term']), hits: Number(m['hits']) })),
  };
});
