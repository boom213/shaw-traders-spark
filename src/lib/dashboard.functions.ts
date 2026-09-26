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
  errorsToday: number;
  recentErrors: { message: string; url: string; at: string }[];
};

export const dashboard = createServerFn({ method: "POST" }).handler(async (): Promise<Dashboard> => {
  const sb = await admin();
  const monthStart = istMidnight(30);

  const [summaryRes, missesRes, errorsRes] = await Promise.all([
    sb.rpc("manager_dashboard_summary", { p_today_from: istMidnight(0), p_week_from: istMidnight(7), p_month_from: monthStart }),
    sb.from("search_misses").select("term, hits").order("hits", { ascending: false }).limit(12),
    sb
      .from("error_log")
      .select("message, url, created_at")
      .gte("created_at", istMidnight(0))
      .order("created_at", { ascending: false })
      .limit(200),
  ]);

  if (summaryRes.error) throw new Error(summaryRes.error.message);
  const summary = (summaryRes.data ?? {}) as Row;

  return {
    todayOrders: Number(summary['todayOrders'] ?? 0),
    todayRevenue: Number(summary['todayRevenue'] ?? 0),
    weekRevenue: Number(summary['weekRevenue'] ?? 0),
    monthRevenue: Number(summary['monthRevenue'] ?? 0),
    pendingOrders: Number(summary['pendingOrders'] ?? 0),
    bestSellers: ((summary['bestSellers'] ?? []) as Row[]).map((item) => ({ name: String(item['name']), qty: Number(item['qty']), revenue: Number(item['revenue']) })),
    noPhoto: Number(summary['noPhoto'] ?? 0),
    noPrice: Number(summary['noPrice'] ?? 0),
    lowStock: ((summary['lowStock'] ?? []) as Row[]).map((item) => ({ id: String(item['id']), name: String(item['name']), stock: Number(item['stock']), threshold: Number(item['threshold']) })),
    emptySearches: ((missesRes.data ?? []) as Row[]).map((m) => ({ term: String(m['term']), hits: Number(m['hits']) })),
    errorsToday: ((errorsRes.data ?? []) as Row[]).length,
    recentErrors: ((errorsRes.data ?? []) as Row[]).slice(0, 5).map((e) => ({
      message: String(e['message'] ?? ""),
      url: String(e['url'] ?? ""),
      at: String(e['created_at'] ?? ""),
    })),
  };
});
