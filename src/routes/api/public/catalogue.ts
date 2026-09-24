import { createFileRoute } from "@tanstack/react-router";

/** Serves the latest uploaded ST catalogue PDF; falls back to the bundled placeholder. */
export const Route = createFileRoute("/api/public/catalogue")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data } = await supabaseAdmin.storage.from("product-photos").download("catalogue/st-catalogue.pdf");
        if (!data) return Response.redirect(new URL("/catalogue.pdf", request.url).toString(), 302);
        return new Response(await data.arrayBuffer(), {
          headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": 'attachment; filename="ST-Catalogue-Shaw-Traders.pdf"',
            "Cache-Control": "public, max-age=300",
          },
        });
      },
    },
  },
});
