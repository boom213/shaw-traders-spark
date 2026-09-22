import { createServerFn } from "@tanstack/react-start";
import { publicClient } from "@/lib/supabase-public.server";
import { PRODUCT_SELECT, mapProduct } from "@/lib/product-map";
import { normaliseSearch } from "@/lib/search-terms";
import type { Category, Product, Review } from "@/lib/catalog";

export type ProductFilters = {
  q?: string;
  category?: string;
  brand?: string;
  voltage?: string;
  ah?: string;
  model?: string;
  min?: number;
  max?: number;
  inStock?: boolean;
  sort?: string;
  page?: number;
  pageSize?: number;
};

const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : undefined);
const num = (v: unknown) => (v === undefined || v === null || v === "" ? undefined : Number(v));

const cleanFilters = (input: ProductFilters | undefined): ProductFilters => ({
  ...(str(input?.q) ? { q: str(input?.q)! } : {}),
  ...(str(input?.category) ? { category: str(input?.category)! } : {}),
  ...(str(input?.brand) ? { brand: str(input?.brand)! } : {}),
  ...(str(input?.voltage) ? { voltage: str(input?.voltage)! } : {}),
  ...(str(input?.ah) ? { ah: str(input?.ah)! } : {}),
  ...(str(input?.model) ? { model: str(input?.model)! } : {}),
  ...(num(input?.min) !== undefined ? { min: num(input?.min)! } : {}),
  ...(num(input?.max) !== undefined ? { max: num(input?.max)! } : {}),
  ...(input?.inStock ? { inStock: true } : {}),
  ...(str(input?.sort) ? { sort: str(input?.sort)! } : {}),
  page: Math.max(0, Number(input?.page ?? 0)),
  pageSize: Math.min(60, Math.max(1, Number(input?.pageSize ?? 24))),
});

async function loadCategories(): Promise<Category[]> {
  const sb = publicClient();
  const [{ data: cats }, { data: prods }] = await Promise.all([
    sb.from("categories").select("slug, name, blurb, image_url, sort_order").order("sort_order"),
    sb.from("products").select("category_id, categories!inner(slug)").eq("status", "visible"),
  ]);
  const counts = new Map<string, number>();
  for (const p of (prods ?? []) as Record<string, any>[]) {
    const slug = String((p['categories'] as any)?.slug ?? "");
    counts.set(slug, (counts.get(slug) ?? 0) + 1);
  }
  return (cats ?? []).map((c) => ({
    slug: c.slug,
    name: c.name,
    blurb: c.blurb ?? "",
    ...(c.image_url ? { imageUrl: c.image_url } : {}),
    productCount: counts.get(c.slug) ?? 0,
  }));
}

export const listCategories = createServerFn({ method: "GET" }).handler(async () => loadCategories());

export const getCategory = createServerFn({ method: "GET" })
  .inputValidator((data: { slug: string }) => ({ slug: String(data?.slug ?? "") }))
  .handler(async ({ data }): Promise<Category | null> => {
    const sb = publicClient();
    const { data: row } = await sb
      .from("categories")
      .select("slug, name, blurb, image_url")
      .eq("slug", data.slug)
      .maybeSingle();
    if (!row) return null;
    return {
      slug: row.slug,
      name: row.name,
      blurb: row.blurb ?? "",
      ...(row.image_url ? { imageUrl: row.image_url } : {}),
    };
  });

export const listProducts = createServerFn({ method: "GET" })
  .inputValidator((data: ProductFilters | undefined) => cleanFilters(data))
  .handler(async ({ data }): Promise<{ items: Product[]; total: number }> => {
    const sb = publicClient();
    const page = data.page ?? 0;
    const size = data.pageSize ?? 24;

    let ids: string[] | null = null;
    let ranked: string[] | null = null;

    // Typo-tolerant, Hinglish-aware search over name, code, brand and vehicle model.
    if (data.q) {
      const term = normaliseSearch(data.q);
      const { data: hits } = await sb.rpc("search_product_ids", { p_term: term, p_limit: 400 });
      const good = ((hits ?? []) as { id: string; score: number }[]).filter((h) => h.score >= 0.28);
      if (good.length === 0) return { items: [], total: 0 };
      ranked = good.map((h) => h.id);
      ids = ranked;
    }

    if (data.model) {
      const { data: compat } = await sb
        .from("product_compatibility")
        .select("product_id")
        .ilike("vehicle_model", `%${data.model}%`)
        .limit(3000);
      const fits = new Set((compat ?? []).map((c) => c.product_id));
      ids = ids ? ids.filter((id) => fits.has(id)) : [...fits];
      if (ids.length === 0) return { items: [], total: 0 };
    }

    const base = () => {
      let query = sb.from("products").select(PRODUCT_SELECT, { count: "exact" }).eq("status", "visible");
      if (data.category) query = query.eq("categories.slug", data.category);
      if (data.brand) query = query.eq("brand", data.brand);
      if (data.voltage) query = query.ilike("voltage", `%${data.voltage}%`);
      if (data.ah) query = query.ilike("ah", `%${data.ah}%`);
      if (data.min !== undefined) query = query.gte("price", data.min);
      if (data.max !== undefined) query = query.lte("price", data.max);
      if (data.inStock) query = query.gt("stock", 0);
      if (ids) query = query.in("id", ids);
      return query;
    };

    // Search results come back best-match first, which PostgREST cannot sort for us.
    if (ranked && !data.sort) {
      const { data: rows, error } = await base().limit(400);
      if (error) throw new Error(error.message);
      const order = new Map(ranked.map((id, i) => [id, i]));
      const all = (rows ?? [])
        .map(mapProduct)
        .sort((a, b) => (order.get(a.id) ?? 999) - (order.get(b.id) ?? 999));
      return { items: all.slice(page * size, page * size + size), total: all.length };
    }

    let query = base();
    if (data.sort === "price-asc") query = query.order("price", { ascending: true, nullsFirst: false });
    else if (data.sort === "price-desc") query = query.order("price", { ascending: false, nullsFirst: false });
    else if (data.sort === "newest") query = query.order("created_at", { ascending: false });
    else query = query.order("name", { ascending: true });

    const { data: rows, count, error } = await query.range(page * size, page * size + size - 1);
    if (error) throw new Error(error.message);
    return { items: (rows ?? []).map(mapProduct), total: count ?? 0 };
  });

/** Instant suggestions for the search box. */
export const searchSuggest = createServerFn({ method: "GET" })
  .inputValidator((data: { q: string }) => ({ q: String(data?.q ?? "").slice(0, 60) }))
  .handler(async ({ data }): Promise<{ products: Product[]; models: string[] }> => {
    const term = normaliseSearch(data.q);
    if (term.length < 2) return { products: [], models: [] };
    const sb = publicClient();

    const { data: hits } = await sb.rpc("search_product_ids", { p_term: term, p_limit: 40 });
    const good = ((hits ?? []) as { id: string; score: number }[]).filter((h) => h.score >= 0.3).slice(0, 6);

    const [{ data: rows }, { data: compat }] = await Promise.all([
      good.length > 0
        ? sb.from("products").select(PRODUCT_SELECT).eq("status", "visible").in("id", good.map((h) => h.id))
        : Promise.resolve({ data: [] as unknown[] }),
      sb.from("product_compatibility").select("vehicle_model").ilike("vehicle_model", `%${term}%`).limit(40),
    ]);

    const order = new Map(good.map((h, i) => [h.id, i]));
    const products = (rows ?? []).map((r) => mapProduct(r as Record<string, unknown>)).sort(
      (a, b) => (order.get(a.id) ?? 99) - (order.get(b.id) ?? 99),
    );
    const models = [...new Set(((compat ?? []) as { vehicle_model: string }[]).map((c) => c.vehicle_model))].slice(0, 5);
    return { products, models };
  });

/** Vehicle brands and the models under them, for the parts finder. */
export const vehicleTree = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ brand: string; models: string[] }[]> => {
    const sb = publicClient();
    const { data } = await sb.from("product_compatibility").select("vehicle_model").limit(5000);
    const tree = new Map<string, Set<string>>();
    for (const row of (data ?? []) as { vehicle_model: string }[]) {
      const model = String(row.vehicle_model ?? "").trim();
      if (!model) continue;
      const brand = model.split(/\s+/)[0] ?? model;
      if (!tree.has(brand)) tree.set(brand, new Set());
      tree.get(brand)!.add(model);
    }
    return [...tree.entries()]
      .map(([brand, models]) => ({ brand, models: [...models].sort() }))
      .filter((b) => b.brand.length > 1)
      .sort((a, b) => a.brand.localeCompare(b.brand));
  },
);

export const listFacets = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ brands: string[]; voltages: string[]; ahs: string[]; models: string[] }> => {
    const sb = publicClient();
    const [{ data: prods }, { data: compat }] = await Promise.all([
      sb.from("products").select("brand, voltage, ah").eq("status", "visible").limit(3000),
      sb.from("product_compatibility").select("vehicle_model").limit(3000),
    ]);
    const brands = new Set<string>();
    const voltages = new Set<string>();
    const ahs = new Set<string>();
    for (const p of prods ?? []) {
      if (p.brand) brands.add(p.brand);
      if (p.voltage) voltages.add(p.voltage);
      if (p.ah) ahs.add(p.ah);
    }
    const models = new Set<string>();
    for (const c of compat ?? []) if (c.vehicle_model) models.add(c.vehicle_model);
    return {
      brands: [...brands].sort(),
      voltages: [...voltages].sort(),
      ahs: [...ahs].sort((a, b) => parseFloat(a) - parseFloat(b) || a.localeCompare(b)),
      models: [...models].sort(),
    };
  },
);

export const getProduct = createServerFn({ method: "GET" })
  .inputValidator((data: { slug: string }) => ({ slug: String(data?.slug ?? "") }))
  .handler(
    async ({
      data,
    }): Promise<{
      product: Product;
      reviews: Review[];
      related: Product[];
      boughtTogether: Product[];
      sameVehicle: Product[];
    } | null> => {
      const sb = publicClient();
      const { data: row } = await sb
        .from("products")
        .select(PRODUCT_SELECT)
        .eq("slug", data.slug)
        .eq("status", "visible")
        .maybeSingle();
      if (!row) return null;
      const product = mapProduct(row);

      const [{ data: reviewRows }, { data: relatedRows }, { data: myLines }] = await Promise.all([
        sb
          .from("reviews")
          .select("id, rating, title, body, is_verified_purchase, photos, staff_reply, created_at")
          .eq("product_id", product.id)
          .eq("status", "approved")
          .order("created_at", { ascending: false })
          .limit(20),
        sb
          .from("products")
          .select(PRODUCT_SELECT)
          .eq("categories.slug", product.category)
          .eq("status", "visible")
          .neq("id", product.id)
          .limit(4),
        sb.from("order_items").select("order_id").eq("product_id", product.id).limit(300),
      ]);

      const reviews: Review[] = (reviewRows ?? []).map((r) => ({
        id: r.id,
        rating: r.rating,
        ...(r.title ? { title: r.title } : {}),
        ...(r.body ? { body: r.body } : {}),
        name: r.is_verified_purchase ? "Verified customer" : "Customer",
        verified: r.is_verified_purchase,
        photos: (r.photos ?? []) as string[],
        reply: r.staff_reply ?? null,
        createdAt: r.created_at,
      }));

      // Parts other customers bought in the same order as this one.
      let boughtTogether: Product[] = [];
      const orderIds = [...new Set((myLines ?? []).map((l) => l.order_id))].slice(0, 200);
      if (orderIds.length > 0) {
        const { data: sideLines } = await sb
          .from("order_items")
          .select("product_id")
          .in("order_id", orderIds)
          .neq("product_id", product.id)
          .limit(1000);
        const tally = new Map<string, number>();
        for (const l of sideLines ?? []) {
          if (!l.product_id) continue;
          tally.set(l.product_id, (tally.get(l.product_id) ?? 0) + 1);
        }
        const top = [...tally.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4).map(([id]) => id);
        if (top.length > 0) {
          const { data: rows } = await sb.from("products").select(PRODUCT_SELECT).in("id", top).eq("status", "visible");
          boughtTogether = (rows ?? []).map(mapProduct);
        }
      }

      // Other parts that fit the same vehicles.
      let sameVehicle: Product[] = [];
      const models = (product.compatibility ?? []).slice(0, 5);
      if (models.length > 0) {
        const { data: compat } = await sb
          .from("product_compatibility")
          .select("product_id")
          .in("vehicle_model", models)
          .limit(400);
        const ids = [...new Set((compat ?? []).map((c) => c.product_id))].filter((id) => id !== product.id).slice(0, 8);
        if (ids.length > 0) {
          const { data: rows } = await sb.from("products").select(PRODUCT_SELECT).in("id", ids).eq("status", "visible").limit(4);
          sameVehicle = (rows ?? []).map(mapProduct);
        }
      }

      return { product, reviews, related: (relatedRows ?? []).map(mapProduct), boughtTogether, sameVehicle };
    },
  );

export const productsByIds = createServerFn({ method: "POST" })
  .inputValidator((data: { ids: string[] }) => ({
    ids: (Array.isArray(data?.ids) ? data.ids : []).filter((i) => typeof i === "string").slice(0, 100),
  }))
  .handler(async ({ data }): Promise<Product[]> => {
    if (data.ids.length === 0) return [];
    const sb = publicClient();
    const { data: rows } = await sb.from("products").select(PRODUCT_SELECT).eq("status", "visible").in("id", data.ids);
    return (rows ?? []).map(mapProduct);
  });

export const homeFeed = createServerFn({ method: "GET" }).handler(async () => {
  const sb = publicClient();
  const [{ data: latest }, { data: deals }, cats] = await Promise.all([
    sb.from("products").select(PRODUCT_SELECT).eq("status", "visible").order("created_at", { ascending: false }).limit(8),
    sb
      .from("products")
      .select(PRODUCT_SELECT)
      .eq("status", "visible")
      .not("mrp", "is", null)
      .not("price", "is", null)
      .order("created_at", { ascending: false })
      .limit(24),
    loadCategories(),
  ]);
  const discounted = (deals ?? [])
    .map(mapProduct)
    .filter((p) => p.mrp && p.price && p.mrp > p.price)
    .slice(0, 8);
  return { latest: (latest ?? []).map(mapProduct), discounted, categories: cats };
});

/** Offers page: discounted parts sorted by saving, best sellers and new arrivals. */
export const offersFeed = createServerFn({ method: "GET" }).handler(async () => {
  const sb = publicClient();
  const [{ data: deals }, { data: latest }, { data: soldRows }] = await Promise.all([
    sb
      .from("products")
      .select(PRODUCT_SELECT)
      .eq("status", "visible")
      .not("mrp", "is", null)
      .not("price", "is", null)
      .limit(300),
    sb.from("products").select(PRODUCT_SELECT).eq("status", "visible").order("created_at", { ascending: false }).limit(8),
    sb.from("order_items").select("product_id, qty").limit(2000),
  ]);

  const pct = (p: Product) => (p.mrp && p.price && p.mrp > p.price ? (p.mrp - p.price) / p.mrp : 0);
  const discounted = (deals ?? []).map(mapProduct).filter((p) => pct(p) > 0).sort((a, b) => pct(b) - pct(a));

  const sold = new Map<string, number>();
  for (const r of soldRows ?? []) {
    if (!r.product_id) continue;
    sold.set(r.product_id, (sold.get(r.product_id) ?? 0) + Number(r.qty ?? 0));
  }
  const topIds = [...sold.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([id]) => id);
  let bestSellers: Product[] = [];
  if (topIds.length > 0) {
    const { data: rows } = await sb.from("products").select(PRODUCT_SELECT).in("id", topIds).eq("status", "visible");
    const byId = new Map((rows ?? []).map((r) => [String((r as Record<string, unknown>)['id']), mapProduct(r)]));
    bestSellers = topIds.map((id) => byId.get(id)).filter((p): p is Product => Boolean(p));
  }

  return { discounted: discounted.slice(0, 40), bestSellers, newArrivals: (latest ?? []).map(mapProduct) };
});
