import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/cron/release-stale-orders")({
  server: { handlers: { POST: async ({ request }) => run(request), GET: async ({ request }) => run(request) } },
});

async function run(request: Request): Promise<Response> {
  const { authenticateCronRequest } = await import("@/integrations/supabase/cron-auth");
  const authError = await authenticateCronRequest(request);
  if (authError) return authError;
  const { releaseStaleOrders } = await import("@/lib/order-cleanup.server");
  const result = await releaseStaleOrders();
  return Response.json({ ok: true, ...result });
}