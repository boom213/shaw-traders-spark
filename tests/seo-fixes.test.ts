import { describe, expect, it, vi } from "vitest";
import { listedCategorySlugs, productHeading } from "@/lib/seo";

const categories = [{ slug: "chargers" }, { slug: "controllers" }, { slug: "motors" }];
const products = [
  { slug: "48v-charger", updated_at: "2026-11-01T00:00:00Z", categories: { slug: "chargers" } },
  { slug: "loose-bolt", updated_at: "2026-11-01T00:00:00Z", categories: null },
];

/** Fake public client: categories and visible parts. */
vi.mock("@/lib/supabase-public.server", () => ({
  publicClient: () => ({
    from: (table: string) => {
      const q: Record<string, unknown> = {};
      let kind = "";
      q.select = () => q;
      q.order = () => q;
      q.eq = (col: string, v: string) => ((kind = col === "product_kind" ? v : kind), q);
      q.range = () => q;
      q.then = (resolve: (v: unknown) => void) =>
        resolve({
          data: table === "categories" ? categories : kind === "part" ? products : [],
          error: null,
        });
      return q;
    },
  }),
}));

describe("product titles", () => {
  it("drop the shop's own brand, which the title suffix already names", () => {
    expect(productHeading("Shaw Traders", "12 No. Bolt for EV Scooter / E-Bike")).toBe(
      "12 No. Bolt for EV Scooter / E-Bike",
    );
  });

  it("keep other brands in front of the name", () => {
    expect(productHeading("Ola", "S1 Pro 60V Controller")).toBe("Ola S1 Pro 60V Controller");
  });

  it("do not repeat a brand the name already contains", () => {
    expect(productHeading("Ola", "Ola S1 Pro Charger")).toBe("Ola S1 Pro Charger");
    expect(productHeading(null, "Brake Shoe")).toBe("Brake Shoe");
  });
});

describe("sitemap", () => {
  it("lists only categories with parts, and leaves out the sign-in page", async () => {
    expect(listedCategorySlugs(products)).toEqual(new Set(["chargers"]));
    const { Route } = await import("@/routes/sitemap[.]xml");
    const handlers = (Route.options as { server: { handlers: { GET: () => Promise<Response> } } })
      .server.handlers;
    const xml = await (await handlers.GET()).text();
    expect(xml).toContain("/category/chargers</loc>");
    expect(xml).not.toContain("/category/controllers");
    expect(xml).not.toContain("/category/motors");
    expect(xml).toContain("/product/48v-charger</loc>");
    expect(xml).toContain("/product/loose-bolt</loc>");
    expect(xml).not.toContain("/account");
    expect(xml).toContain("<loc>https://shawtradersev.com/shop</loc>");
  });
});

describe("category pages", () => {
  type Head = (ctx: unknown) => { meta: { name?: string; content?: string }[] };
  const robots = async (listed: boolean) => {
    const { Route } = await import("@/routes/category.$slug");
    const head = Route.options.head as unknown as Head;
    const { meta } = head({
      loaderData: { category: { slug: "controllers", name: "Controllers", blurb: "x" }, listed },
      params: { slug: "controllers" },
    });
    return meta.find((m) => m.name === "robots")?.content;
  };

  it("keep empty categories out of Google", async () => {
    expect(await robots(false)).toBe("noindex, follow");
  });

  it("leave stocked categories indexable", async () => {
    expect(await robots(true)).toBeUndefined();
  });
});
