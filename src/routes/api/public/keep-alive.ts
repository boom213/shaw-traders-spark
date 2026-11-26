import { createFileRoute } from "@tanstack/react-router";
import { authenticateCronRequest } from "@/integrations/supabase/cron-auth";

/** Scheduler-only ping: one tiny read keeps the database from sleeping. */
export const Route = createFileRoute("/api/public/keep-alive")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authFailure = await authenticateCronRequest(request);
        if (authFailure) return authFailure;
        const headers = { "Content-Type": "application/json", "Cache-Control": "no-store" };
        try {
          const { publicClient } = await import("@/lib/supabase-public.server");
          const { error } = await publicClient().from("categories").select("slug").limit(1);
          if (error) throw new Error(error.message);
        } catch {
          return new Response(JSON.stringify({ status: "error" }), { status: 503, headers });
        }
        return new Response(JSON.stringify({ status: "ok" }), { headers });
      },
    },
  },
});
