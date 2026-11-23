import { createFileRoute } from "@tanstack/react-router";
import { authenticateCronRequest } from "@/integrations/supabase/cron-auth";

/**
 * Releases unpaid online orders after the reservation window.
 * Called by the scheduler; protected by the private cron secret, never by a
 * key that browsers can see.
 */
export const Route = createFileRoute("/api/public/cron/release-stale-orders")({
  server: { handlers: { POST: async ({ request }) => run(request), GET: async ({ request }) => run(request) } },
});

async function run(request: Request): Promise<Response> {
  const denied = await authenticateCronRequest(request);
  if (denied) return denied;
  const { releaseStaleOrders } = await import("@/lib/order-cleanup.server");
  const result = await releaseStaleOrders();
  return Response.json({ ok: true, ...result });
}
