import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/cron/release-stale-orders")({
  server: { handlers: { POST: async ({ request }) => run(request), GET: async ({ request }) => run(request) } },
});

async function run(request: Request): Promise<Response> {
  const supplied = request.headers.get("apikey") ?? "";
  const expected = process.env['SUPABASE_PUBLISHABLE_KEY'] ?? "";
  if (!expected || supplied !== expected) return new Response("Unauthorized", { status: 401 });
  const { releaseStaleOrders } = await import("@/lib/order-cleanup.server");
  const result = await releaseStaleOrders();
  return Response.json({ ok: true, ...result });
}