import { createFileRoute } from "@tanstack/react-router";

/**
 * Uptime probe for an external monitor: returns 200 only when the site can
 * actually read the catalogue, so a dead database shows up as downtime.
 */
export const Route = createFileRoute("/api/public/health")({
  server: {
    handlers: {
      GET: async () => {
        const started = Date.now();
        try {
          const { publicClient } = await import("@/lib/supabase-public.server");
          const { error } = await publicClient().from("categories").select("slug").limit(1);
          if (error) throw new Error(error.message);
        } catch (err) {
          return new Response(
            JSON.stringify({ status: "error", detail: err instanceof Error ? err.message : "unknown" }),
            { status: 503, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } },
          );
        }
        return new Response(JSON.stringify({ status: "ok", ms: Date.now() - started }), {
          headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
        });
      },
    },
  },
});
