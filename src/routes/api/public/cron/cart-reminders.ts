import { createFileRoute } from "@tanstack/react-router";

/**
 * Reminds shoppers about carts they left behind a few hours ago.
 * Called by the scheduler; protected by the shared cron secret.
 */
export const Route = createFileRoute("/api/public/cron/cart-reminders")({
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

  const { sendAbandonedCartReminders } = await import("@/lib/reminders.server");
  const result = await sendAbandonedCartReminders();
  return Response.json({ ok: true, sent: result.sent });
}
