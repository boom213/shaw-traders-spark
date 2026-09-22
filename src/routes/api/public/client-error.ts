import { createFileRoute } from "@tanstack/react-router";

/**
 * Collects crashes that happen in a customer's browser so the shop can see
 * them in the manager area instead of hearing "the site broke" on the phone.
 */
export const Route = createFileRoute("/api/public/client-error")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: { message?: string; stack?: string; url?: string } = {};
        try {
          body = (await request.json()) as typeof body;
        } catch {
          return new Response("Bad request", { status: 400 });
        }
        const message = String(body.message ?? "").slice(0, 500);
        if (!message) return new Response("Bad request", { status: 400 });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // Cheap flood guard: at most 200 reports an hour.
        const hourAgo = new Date(Date.now() - 60 * 60_000).toISOString();
        const { count } = await supabaseAdmin
          .from("error_log")
          .select("id", { count: "exact", head: true })
          .gte("created_at", hourAgo);
        if ((count ?? 0) >= 200) return new Response("ok");

        await supabaseAdmin.from("error_log").insert({
          source: "client",
          message,
          stack: String(body.stack ?? "").slice(0, 4000) || null,
          url: String(body.url ?? "").slice(0, 500) || null,
          user_agent: request.headers.get("user-agent")?.slice(0, 300) ?? null,
        });

        return new Response("ok");
      },
    },
  },
});
