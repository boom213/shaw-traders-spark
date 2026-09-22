import { createFileRoute } from "@tanstack/react-router";

/** Nudges owners whose next service is due within a week. */
export const Route = createFileRoute("/api/public/cron/service-reminders")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env['CRON_SECRET'] ?? "";
        const given = request.headers.get("x-cron-secret") ?? "";
        if (!secret || given !== secret) return new Response("Unauthorized", { status: 401 });
        const { sendServiceReminders } = await import("@/lib/vehicle-notify.server");
        const result = await sendServiceReminders();
        return Response.json(result);
      },
    },
  },
});
