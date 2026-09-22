import { createFileRoute } from "@tanstack/react-router";

/**
 * Daily summary for the owner: orders received, revenue and low stock.
 * Called by the scheduler; protected by the shared cron secret.
 */
export const Route = createFileRoute("/api/public/cron/daily-summary")({
  server: {
    handlers: {
      POST: async ({ request }) => run(request),
      GET: async ({ request }) => run(request),
    },
  },
});

async function run(request: Request): Promise<Response> {
  const expected = process.env['LOVABLE_CRON_SECRET'];
  const provided =
    request.headers.get("x-cron-secret") ??
    new URL(request.url).searchParams.get("secret") ??
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
    "";
  if (!expected || provided !== expected) return new Response("Unauthorized", { status: 401 });

  const { sendDailySummary } = await import("@/lib/notify.server");
  const result = await sendDailySummary(new Date(), false);
  return Response.json({ ok: true, day: result.day, sent: result.sent });
}
