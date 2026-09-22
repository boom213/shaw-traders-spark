import { createServerFn } from "@tanstack/react-start";
import { publicClient } from "@/lib/supabase-public.server";
import { PRODUCT_SELECT, mapProduct } from "@/lib/product-map";
import type { Category, Product, Review } from "@/lib/catalog";

export type ProductFilters = {
  q?: string;
  category?: string;
  brand?: string;
  voltage?: string;
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
  ...(str(input?.model) ? { model: str(input?.model)! } : {}),
  ...(num(input?.min) !== undefined ? { min: num(input?.min)! } : {}),
  ...(num(input?.max) !== undefined ? { max: num(input?.max)! } : {}),
  ...(input?.inStock ? { inStock: true } : {}),
  ...(str(input?.sort) ? { sort: str(input?.sort)! } : {}),
  page: Math.max(0, Number(input?.page ?? 0)),
  pageSize: Math.min(60, Math.max(1, Number(input?.pageSize ?? 24))),
});

export const listCategories = createServerFn({ method: "GET" }).handler(async (): Promise<Category[]> => {
  const sb = publicClient();
  const [{ data: cats }, { data: prods }] = await Promise.all([
    sb.from("categories").select("slug, name, blurb, image_url, sort_order").order("sort_order"),
    sb.from("products").select("category_id, categories!inner(slug)").eq("is_active", true),
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
});

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
    if (data.model) {
      const { data: compat } = await sb
        .from("product_compatibility")
        .select("product_id")
        .ilike("vehicle_model", `%${data.model}%`)
        .limit(2000);
      ids = Array.from(new Set((compat ?? []).map((c) => c.product_id)));
      if (ids.length === 0) return { items: [], total: 0 };
    }

    let query = sb.from("products").select(PRODUCT_SELECT, { count: "exact" }).eq("is_active", true);

    if (data.q) {
      const t = data.q.replace(/[%,()]/g, " ").trim();
      query = query.or(
        `name.ilike.%${t}%,sku.ilike.%${t}%,brand.ilike.%${t}%,model.ilike.%${t}%,description.ilike.%${t}%,subcategory.ilike.%${t}%`,
      );
    }
    if (data.category) query = query.eq("categories.slug", data.category);
    if (data.brand) query = query.eq("brand", data.brand);
    if (data.voltage) query = query.ilike("voltage", `%${data.voltage}%`);
    if (data.min !== undefined) query = query.gte("price", data.min);
    if (data.max !== undefined) query = query.lte("price", data.max);
    if (data.inStock) query = query.gt("stock", 0);
    if (ids) query = query.in("id", ids);

    if (data.sort === "price-asc") query = query.order("price", { ascending: true, nullsFirst: false });
    else if (data.sort === "price-desc") query = query.order("price", { ascending: false, nullsFirst: false });
    else if (data.sort === "newest") query = query.order("created_at", { ascending: false });
    else query = query.order("name", { ascending: true });

    const { data: rows, count, error } = await query.range(page * size, page * size + size - 1);
    if (error) throw new Error(error.message);
    return { items: (rows ?? []).map(mapProduct), total: count ?? 0 };
  });

export const listFacets = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ brands: string[]; voltages: string[]; models: string[] }> => {
    const sb = publicClient();
    const [{ data: prods }, { data: compat }] = await Promise.all([
      sb.from("products").select("brand, voltage").eq("is_active", true).limit(2000),
      sb.from("product_compatibility").select("vehicle_model").limit(3000),
    ]);
    const brands = new Set<string>();
    const voltages = new Set<string>();
    for (const p of prods ?? []) {
      if (p.brand) brands.add(p.brand);
      if (p.voltage) voltages.add(p.voltage);
    }
    const models = new Set<string>();
    for (const c of compat ?? []) if (c.vehicle_model) models.add(c.vehicle_model);
    return {
      brands: [...brands].sort(),
      voltages: [...voltages].sort(),
      models: [...models].sort(),
    };
  },
);

export const getProduct = createServerFn({ method: "GET" })
  .inputValidator((data: { slug: string }) => ({ slug: String(data?.slug ?? "") }))
  .handler(async ({ data }): Promise<{ product: Product; reviews: Review[]; related: Product[] } | null> => {
    const sb = publicClient();
    const { data: row } = await sb
      .from("products")
      .select(PRODUCT_SELECT)
      .eq("slug", data.slug)
      .eq("is_active", true)
      .maybeSingle();
    if (!row) return null;
    const product = mapProduct(row);

    const [{ data: reviewRows }, { data: relatedRows }] = await Promise.all([
      sb
        .from("reviews")
        .select("id, rating, title, body, is_verified_purchase, created_at")
        .eq("product_id", product.id)
        .eq("status", "approved")
        .order("created_at", { ascending: false })
        .limit(20),
      sb
        .from("products")
        .select(PRODUCT_SELECT)
        .eq("categories.slug", product.category)
        .eq("is_active", true)
        .neq("id", product.id)
        .limit(4),
    ]);

    const reviews: Review[] = (reviewRows ?? []).map((r) => ({
      id: r.id,
      rating: r.rating,
      ...(r.title ? { title: r.title } : {}),
      ...(r.body ? { body: r.body } : {}),
      name: r.title ? "Verified customer" : "Customer",
      verified: r.is_verified_purchase,
      createdAt: r.created_at,
    }));

    return { product, reviews, related: (relatedRows ?? []).map(mapProduct) };
  });

export const productsByIds = createServerFn({ method: "POST" })
  .inputValidator((data: { ids: string[] }) => ({
    ids: (Array.isArray(data?.ids) ? data.ids : []).filter((i) => typeof i === "string").slice(0, 100),
  }))
  .handler(async ({ data }): Promise<Product[]> => {
    if (data.ids.length === 0) return [];
    const sb = publicClient();
    const { data: rows } = await sb.from("products").select(PRODUCT_SELECT).in("id", data.ids);
    return (rows ?? []).map(mapProduct);
  });

export const homeFeed = createServerFn({ method: "GET" }).handler(async () => {
  const sb = publicClient();
  const [{ data: latest }, { data: deals }, cats] = await Promise.all([
    sb.from("products").select(PRODUCT_SELECT).eq("is_active", true).order("created_at", { ascending: false }).limit(8),
    sb
      .from("products")
      .select(PRODUCT_SELECT)
      .eq("is_active", true)
      .not("mrp", "is", null)
      .not("price", "is", null)
      .order("created_at", { ascending: false })
      .limit(24),
    listCategories(),
  ]);
  const discounted = (deals ?? [])
    .map(mapProduct)
    .filter((p) => p.mrp && p.price && p.mrp > p.price)
    .slice(0, 8);
  return { latest: (latest ?? []).map(mapProduct), discounted, categories: cats };
});
