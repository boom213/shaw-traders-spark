import { createFileRoute } from "@tanstack/react-router";
import { originalPathFromThumbnail } from "@/lib/product-photo";

/**
 * Serves product photos from private storage so the shop can show them to
 * everyone while uploads stay staff-only. Answers are cached hard because
 * every uploaded file gets a fresh, unique name.
 */
export const Route = createFileRoute("/api/public/photo/$")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const raw = String((params as Record<string, string>)['_splat'] ?? "").replace(/^\/+/, "");
        if (!raw || raw.includes("..")) return new Response("Not found", { status: 404 });

        // Older product photo links have no bucket prefix, so product photos stay the default.
        const first = raw.split("/")[0] ?? "";
        const bucket = first === "review-photos" ? "review-photos" : "product-photos";
        const path = first === "review-photos" ? raw.slice(first.length + 1) : raw;
        if (!path) return new Response("Not found", { status: 404 });

        if (bucket === "product-photos" && originalPathFromThumbnail(path)) {
          const { loadOrCreateProductThumbnail } = await import("@/lib/product-thumbnail.server");
          const thumbnail = await loadOrCreateProductThumbnail(path);
          if (!thumbnail) return new Response("Not found", { status: 404 });
          const body = thumbnail.bytes.buffer.slice(thumbnail.bytes.byteOffset, thumbnail.bytes.byteOffset + thumbnail.bytes.byteLength) as ArrayBuffer;
          return new Response(body, {
            headers: {
              "Content-Type": thumbnail.type || "image/png",
              "Cache-Control": "public, max-age=31536000, immutable",
            },
          });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await supabaseAdmin.storage.from(bucket).download(path);
        if (error || !data) return new Response("Not found", { status: 404 });

        return new Response(await data.arrayBuffer(), {
          headers: {
            "Content-Type": data.type || "image/webp",
            "Cache-Control": "public, max-age=31536000, immutable",
          },
        });
      },
    },
  },
});
