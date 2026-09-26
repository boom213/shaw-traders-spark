export async function releaseStaleOrders(): Promise<{ released: number; failed: number }> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const cutoff = new Date(Date.now() - 30 * 60 * 1000).toISOString();
  const { data: orders, error } = await supabaseAdmin.from("orders").select("id").eq("payment_status", "pending").eq("stock_released", false).lt("placed_at", cutoff).limit(100);
  if (error) throw new Error(error.message);
  let released = 0;
  let failed = 0;
  for (const order of orders ?? []) {
    try {
      const { data, error: releaseError } = await supabaseAdmin.rpc("release_order", { p_order_id: order.id, p_reason: "Online payment was not completed within 30 minutes" });
      if (releaseError) throw releaseError;
      if (data) {
        released += 1;
        const { notifyOrderStatus } = await import("@/lib/notify.server");
        await notifyOrderStatus(order.id, "cancelled", "Your unpaid reservation expired after 30 minutes. No payment was recorded; please place a new order if you still need these items.");
      }
    } catch (error) {
      failed += 1;
      console.error("stale order release failed", order.id, error);
    }
  }
  return { released, failed };
}