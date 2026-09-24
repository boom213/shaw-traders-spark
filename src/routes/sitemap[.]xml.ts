import { createFileRoute } from "@tanstack/react-router";
import { BUSINESS } from "@/lib/catalog";

const BASE = BUSINESS.site;

const STATIC_PAGES: { path: string; priority: string; changefreq: string }[] = [
  { path: "/", priority: "1.0", changefreq: "daily" },
  { path: "/shop", priority: "0.9", changefreq: "daily" },
  { path: "/scooters", priority: "0.9", changefreq: "daily" },
  { path: "/service", priority: "0.5", changefreq: "monthly" },
  { path: "/categories", priority: "0.8", changefreq: "weekly" },
  { path: "/find-parts", priority: "0.8", changefreq: "weekly" },
  { path: "/offers", priority: "0.7", changefreq: "weekly" },
  { path: "/bulk", priority: "0.6", changefreq: "monthly" },
  { path: "/about", priority: "0.5", changefreq: "monthly" },
  { path: "/brand", priority: "0.6", changefreq: "monthly" },
  { path: "/contact", priority: "0.6", changefreq: "monthly" },
  { path: "/trade", priority: "0.6", changefreq: "monthly" },
  { path: "/account", priority: "0.5", changefreq: "monthly" },
  { path: "/track", priority: "0.4", changefreq: "monthly" },
  { path: "/returns", priority: "0.4", changefreq: "yearly" },
  { path: "/shipping", priority: "0.4", changefreq: "yearly" },
  { path: "/warranty", priority: "0.4", changefreq: "yearly" },
  { path: "/privacy", priority: "0.3", changefreq: "yearly" },
  { path: "/terms", priority: "0.3", changefreq: "yearly" },
];

const escape = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function urlEntry(path: string, opts: { lastmod?: string | null; priority?: string; changefreq?: string } = {}) {
  return [
    "  <url>",
    `    <loc>${escape(BASE + path)}</loc>`,
    opts.lastmod ? `    <lastmod>${new Date(opts.lastmod).toISOString().slice(0, 10)}</lastmod>` : "",
    opts.changefreq ? `    <changefreq>${opts.changefreq}</changefreq>` : "",
    opts.priority ? `    <priority>${opts.priority}</priority>` : "",
    "  </url>",
  ]
    .filter(Boolean)
    .join("\n");
}

/**
 * Sitemap built from the live catalogue: every active, listed product and
 * category, plus the static pages. Paginated so the full catalogue is
 * covered, not just the first page of rows.
 */
export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const { publicClient } = await import("@/lib/supabase-public.server");
        const sb = publicClient();

        const entries: string[] = STATIC_PAGES.map((p) =>
          urlEntry(p.path, { priority: p.priority, changefreq: p.changefreq }),
        );

        try {
          const { data: categories, error: catError } = await sb.from("categories").select("slug").order("slug");
          if (catError) throw new Error(catError.message);
          for (const c of categories ?? []) {
            entries.push(urlEntry(`/category/${c.slug}`, { priority: "0.8", changefreq: "daily" }));
          }

          const pageSize = 1000;
          for (let page = 0; page < 20; page++) {
            const { data: products, error } = await sb
              .from("products")
              .select("slug, updated_at")
              .eq("status", "visible")
              .eq("product_kind", "part")
              .order("slug")
              .range(page * pageSize, page * pageSize + pageSize - 1);
            if (error) throw new Error(error.message);
            for (const p of products ?? []) {
              entries.push(urlEntry(`/product/${p.slug}`, { lastmod: p.updated_at, priority: "0.7", changefreq: "weekly" }));
            }
            if (!products || products.length < pageSize) break;
          }

          const { data: vehicles, error: vErr } = await sb
            .from("products")
            .select("slug, updated_at")
            .eq("status", "visible")
            .eq("product_kind", "vehicle")
            .order("slug");
          if (vErr) throw new Error(vErr.message);
          for (const v of vehicles ?? []) {
            entries.push(urlEntry(`/scooters/${v.slug}`, { lastmod: v.updated_at, priority: "0.8", changefreq: "weekly" }));
          }
        } catch (err) {
          console.error("sitemap generation failed", err);
          return new Response("Sitemap temporarily unavailable", { status: 503 });
        }

        const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.join("\n")}\n</urlset>\n`;
        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml; charset=utf-8",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
