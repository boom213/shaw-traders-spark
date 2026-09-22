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
