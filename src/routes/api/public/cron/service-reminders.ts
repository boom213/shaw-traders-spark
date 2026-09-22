import { createFileRoute } from "@tanstack/react-router";

/** Nudges owners whose next service is due within a week. */
export const Route = createFileRoute("/api/public/cron/service-reminders")({
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

  const { sendServiceReminders } = await import("@/lib/vehicle-notify.server");
  const result = await sendServiceReminders();
  return Response.json({ ok: true, sent: result.sent });
}
