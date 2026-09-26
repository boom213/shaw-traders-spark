import { createServerFn } from "@tanstack/react-start";

type Row = Record<string, any>;

async function adminAs() {
  const { requireStaff, logAudit } = await import("@/lib/staff.server");
  const actor = await requireStaff({ capability: "catalogue" });
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return { sb: supabaseAdmin, actor, logAudit };
}

export type CatalogueRow = {
  id: string;
  sku: string;
  name: string;
  category: string;
  categoryName: string;
  brand: string | null;
  price: number | null;
  wholesalePrice: number | null;
  mrp: number | null;
  stock: number;
  reorderThreshold: number | null;
  images: string[];
  status: string;
  rackLocation: string | null;
  productKind: "part" | "vehicle";
};

export type CatalogueProductDetail = CatalogueRow & {
  slug: string;
  subcategory: string | null;
  model: string | null;
  description: string | null;
  specs: Record<string, string>;
  voltage: string | null;
  ah: string | null;
  wattage: string | null;
  warranty: string | null;
  weight: string | null;
  dimensions: string | null;
  shippingInfo: string | null;
  boxContents: string | null;
  hsnCode: string | null;
  orderingMode: "full" | "enquiry" | "browse" | null;
  compatibility: { vehicleModel: string; yearFrom: number | null; yearTo: number | null; variant: string | null }[];
};

export type ProductBrand = { id: string; name: string };

/** Shared managed brand list for product creation and editing. */
export const productBrands = createServerFn({ method: "POST" }).handler(async (): Promise<ProductBrand[]> => {
  const { sb } = await adminAs();
  const { data, error } = await sb.from("product_brands").select("id, name").order("name");
  if (error) throw new Error(error.message);
  return (data ?? []).map((brand) => ({ id: brand.id, name: brand.name }));
});

export const createProductBrand = createServerFn({ method: "POST" })
  .inputValidator((data: { name: string }) => ({ name: String(data?.name ?? "").trim().slice(0, 120) }))
  .handler(async ({ data }) => {
    const { sb, actor, logAudit } = await adminAs();
    if (!data.name) return { ok: false as const, error: "Enter a brand name." };
    const { data: brand, error } = await sb.from("product_brands").insert({ name: data.name }).select("id, name").single();
    if (error) return { ok: false as const, error: error.code === "23505" ? "That brand already exists." : error.message };
    await logAudit(sb as never, actor, "product_brands.created", "product_brands", brand.id, { name: brand.name });
    return { ok: true as const, brand: { id: brand.id, name: brand.name } };
  });

export const renameProductBrand = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string; name: string }) => ({ id: String(data?.id ?? "").trim(), name: String(data?.name ?? "").trim().slice(0, 120) }))
  .handler(async ({ data }) => {
    const { sb, actor, logAudit } = await adminAs();
    if (!data.id || !data.name) return { ok: false as const, error: "Enter a brand name." };
    const { data: oldName, error } = await sb.rpc("rename_product_brand", { p_brand_id: data.id, p_new_name: data.name });
    if (error) {
      const duplicate = error.code === "23505" || error.message.includes("already exists");
      return { ok: false as const, error: duplicate ? "That brand already exists." : error.message };
    }
    await logAudit(sb as never, actor, "product_brands.renamed", "product_brands", data.id, { from: oldName, to: data.name });
    return { ok: true as const };
  });

async function validManagedBrand(sb: Awaited<ReturnType<typeof adminAs>>["sb"], name: string): Promise<string | null | false> {
  const value = name.trim();
  if (!value) return null;
  const { data } = await sb.from("product_brands").select("name").ilike("name", value).maybeSingle();
  return data?.name ?? false;
}

const SELECT =
  "id, sku, name, brand, price, mrp, stock, reorder_threshold, status, rack_location, product_kind, categories!inner(slug, name), product_images(url, sort_order), price_tiers(tier, price, min_qty)";

const mapRow = (r: Row): CatalogueRow => ({
  id: String(r['id']),
  sku: String(r['sku'] ?? ""),
  name: String(r['name']),
  category: String(r['categories']?.['slug'] ?? ""),
  categoryName: String(r['categories']?.['name'] ?? ""),
  brand: r['brand'] ?? null,
  price: r['price'] === null || r['price'] === undefined ? null : Number(r['price']),
  wholesalePrice: (() => {
    const tier = ((r['price_tiers'] ?? []) as Row[])
      .filter((item) => item['tier'] === "trade")
      .sort((a, b) => Number(a['min_qty'] ?? 1) - Number(b['min_qty'] ?? 1))[0];
    return tier?.['price'] === null || tier?.['price'] === undefined ? null : Number(tier['price']);
  })(),
  mrp: r['mrp'] === null || r['mrp'] === undefined ? null : Number(r['mrp']),
  stock: Number(r['stock'] ?? 0),
  reorderThreshold: r['reorder_threshold'] === null || r['reorder_threshold'] === undefined ? null : Number(r['reorder_threshold']),
  status: String(r['status'] ?? "visible"),
  rackLocation: r['rack_location'] ?? null,
  productKind: r['product_kind'] === "vehicle" ? "vehicle" : "part",
  images: ((r['product_images'] ?? []) as Row[])
    .slice()
    .sort((a, b) => Number(a['sort_order'] ?? 0) - Number(b['sort_order'] ?? 0))
    .map((i) => String(i['url'])),
});

/** Searchable, filterable product list for the phone-friendly catalogue screen. */
export const catalogueList = createServerFn({ method: "POST" })
  .inputValidator((data: { q?: string; category?: string; filter?: string; page?: number; pageSize?: number } | undefined) => ({
    q: String(data?.q ?? "").trim(),
    category: String(data?.category ?? ""),
    filter: String(data?.filter ?? "all"),
    page: Math.max(0, Math.floor(Number(data?.page ?? 0))),
    pageSize: [10, 20, 50, 100].includes(Number(data?.pageSize)) ? Number(data?.pageSize) : 20,
  }))
  .handler(async ({ data }): Promise<{ items: CatalogueRow[]; total: number }> => {
    const { sb } = await adminAs();
    const size = data.pageSize;

    // Photo and low-stock filters compare joined/calculated values. Read every
    // matching row in bounded batches so their totals and later pages stay exact.
    const inMemory = data.filter === "no-photo" || data.filter === "low-stock";
    let query = sb.from("products").select(SELECT, { count: "exact" });
    if (data.q) {
      const t = data.q.replace(/[%,()]/g, " ");
      query = query.or(`name.ilike.%${t}%,sku.ilike.%${t}%,brand.ilike.%${t}%,model.ilike.%${t}%,rack_location.ilike.%${t}%`);
    }
    if (data.category) query = query.eq("categories.slug", data.category);
    if (data.filter === "no-price") query = query.is("price", null);
    if (data.filter === "draft" || data.filter === "visible" || data.filter === "hidden") query = query.eq("status", data.filter);
    if (data.filter === "no-rack") query = query.is("rack_location", null);
    if (data.filter === "no-stock") query = query.eq("stock", 0);

    if (inMemory) {
      const allRows: Row[] = [];
      const batchSize = 1000;
      for (let from = 0; ; from += batchSize) {
        const { data: rows, error } = await query.order("name").range(from, from + batchSize - 1);
        if (error) throw new Error(error.message);
        allRows.push(...((rows ?? []) as Row[]));
        if ((rows ?? []).length < batchSize) break;
      }
      let items = allRows.map(mapRow);
      items =
        data.filter === "no-photo"
          ? items.filter((p) => p.images.length === 0)
          : items.filter((p) => p.stock <= (p.reorderThreshold ?? 3));
      return { items: items.slice(data.page * size, data.page * size + size), total: items.length };
    }

    const { data: rows, count, error } = await query
      .order("name")
      .range(data.page * size, data.page * size + size - 1);
    if (error) throw new Error(error.message);
    return { items: (rows ?? []).map(mapRow), total: count ?? 0 };
  });

/** Read-only product directory available to every staff role. */
export const allProductsList = createServerFn({ method: "POST" })
  .inputValidator((data: { q?: string; category?: string; status?: string; page?: number; pageSize?: number } | undefined) => ({
    q: String(data?.q ?? "").trim().slice(0, 160),
    category: String(data?.category ?? "").trim(),
    status: ["visible", "draft", "hidden"].includes(String(data?.status)) ? String(data?.status) : "",
    page: Math.max(0, Math.floor(Number(data?.page ?? 0))),
    pageSize: [10, 20, 50, 100].includes(Number(data?.pageSize)) ? Number(data?.pageSize) : 20,
  }))
  .handler(async ({ data }): Promise<{ items: CatalogueRow[]; total: number }> => {
    const { requireStaff } = await import("@/lib/staff.server");
    await requireStaff({ capability: "operations" });
    const { supabaseAdmin: sb } = await import("@/integrations/supabase/client.server");

    let categoryId = "";
    if (data.category) {
      const { data: category, error: categoryError } = await sb
        .from("categories")
        .select("id")
        .eq("slug", data.category)
        .maybeSingle();
      if (categoryError) throw new Error(categoryError.message);
      if (!category) return { items: [], total: 0 };
      categoryId = category.id;
    }

    let query = sb.from("products").select(SELECT.replace("categories!inner", "categories"), { count: "exact" });
    if (data.q) {
      const term = data.q.replace(/[%,()]/g, " ");
      query = query.or(`name.ilike.%${term}%,sku.ilike.%${term}%,brand.ilike.%${term}%,model.ilike.%${term}%,rack_location.ilike.%${term}%`);
    }
    if (categoryId) query = query.eq("category_id", categoryId);
    if (data.status) query = query.eq("status", data.status as "visible" | "draft" | "hidden");

    const from = data.page * data.pageSize;
    const { data: rows, count, error } = await query
      .order("name")
      .range(from, from + data.pageSize - 1);
    if (error) throw new Error(error.message);
    return { items: (rows ?? []).map(mapRow), total: count ?? 0 };
  });

/** Load every editable field for one parts product. */
export const getCatalogueProduct = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string }) => ({ id: String(data?.id ?? "").trim() }))
  .handler(async ({ data }): Promise<{ ok: true; product: CatalogueProductDetail } | { ok: false; error: string }> => {
    const { sb } = await adminAs();
    const { data: row, error } = await sb
      .from("products")
      .select("id, sku, slug, name, subcategory, brand, model, price, mrp, stock, description, specs, voltage, ah, wattage, warranty, weight, dimensions, shipping_info, box_contents, hsn_code, ordering_mode, status, reorder_threshold, rack_location, product_kind, categories!inner(slug, name), product_images(url, sort_order), price_tiers(tier, price, min_qty), product_compatibility(vehicle_model, year_from, year_to, variant)")
      .eq("id", data.id)
      .maybeSingle();
    if (error) return { ok: false, error: error.message };
    if (!row || row.product_kind !== "part") return { ok: false, error: "Product not found." };
    const base = mapRow(row as Row);
    return {
      ok: true,
      product: {
        ...base,
        slug: String(row.slug ?? ""),
        subcategory: row.subcategory ?? null,
        model: row.model ?? null,
        description: row.description ?? null,
        specs: (row.specs ?? {}) as Record<string, string>,
        voltage: row.voltage ?? null,
        ah: row.ah ?? null,
        wattage: row.wattage ?? null,
        warranty: row.warranty ?? null,
        weight: row.weight ?? null,
        dimensions: row.dimensions ?? null,
        shippingInfo: row.shipping_info ?? null,
        boxContents: row.box_contents ?? null,
        hsnCode: row.hsn_code ?? null,
        orderingMode: row.ordering_mode ?? null,
        compatibility: ((row.product_compatibility ?? []) as Row[]).map((item) => ({
          vehicleModel: String(item['vehicle_model'] ?? ""),
          yearFrom: item['year_from'] === null ? null : Number(item['year_from']),
          yearTo: item['year_to'] === null ? null : Number(item['year_to']),
          variant: item['variant'] ?? null,
        })),
      },
    };
  });

export type UpdateCatalogueProductInput = {
  id: string; name: string; sku: string; slug: string; category: string; subcategory: string; brand: string; model: string;
  price: number | null; wholesalePrice: number | null; mrp: number | null; stock: number; reorderThreshold: number | null;
  rackLocation: string; status: string; orderingMode: string; description: string; specs: Record<string, string>;
  voltage: string; ah: string; wattage: string; warranty: string; weight: string; dimensions: string; shippingInfo: string;
  boxContents: string; hsnCode: string;
  compatibility: { vehicleModel: string; yearFrom: number | null; yearTo: number | null; variant: string }[];
};

/** Save the complete parts-product record from the dedicated editor. */
export const updateCatalogueProduct = createServerFn({ method: "POST" })
  .inputValidator((input: UpdateCatalogueProductInput) => ({
    ...input,
    id: String(input?.id ?? "").trim(),
    name: String(input?.name ?? "").trim().slice(0, 180),
    sku: String(input?.sku ?? "").trim().toUpperCase().slice(0, 80),
    slug: String(input?.slug ?? "").trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 180),
    category: String(input?.category ?? "").trim(),
    brand: String(input?.brand ?? "").trim().slice(0, 120),
    status: ["visible", "draft", "hidden"].includes(String(input?.status)) ? String(input.status) : "draft",
    orderingMode: ["full", "enquiry", "browse"].includes(String(input?.orderingMode)) ? String(input.orderingMode) : "",
    stock: Math.max(0, Math.floor(Number(input?.stock ?? 0))),
    compatibility: (Array.isArray(input?.compatibility) ? input.compatibility : []).slice(0, 50).map((item) => ({
      vehicleModel: String(item?.vehicleModel ?? "").trim().slice(0, 160),
      yearFrom: item?.yearFrom === null ? null : Math.floor(Number(item.yearFrom)),
      yearTo: item?.yearTo === null ? null : Math.floor(Number(item.yearTo)),
      variant: String(item?.variant ?? "").trim().slice(0, 120),
    })).filter((item) => item.vehicleModel),
  }))
  .handler(async ({ data }) => {
    const { sb, actor, logAudit } = await adminAs();
    if (data.name.length < 2) return { ok: false as const, error: "Enter a product name." };
    if (!data.sku) return { ok: false as const, error: "Enter a product code (SKU)." };
    if (!data.slug) return { ok: false as const, error: "Enter a valid product URL slug." };
    for (const [label, value] of [["Price", data.price], ["Wholesale price", data.wholesalePrice], ["MRP", data.mrp], ["Reorder warning", data.reorderThreshold]] as const) {
      if (value !== null && (!Number.isFinite(Number(value)) || Number(value) < 0)) return { ok: false as const, error: `${label} must be zero or more.` };
    }
    const { data: category } = await sb.from("categories").select("id").eq("slug", data.category).maybeSingle();
    if (!category) return { ok: false as const, error: "Choose a valid category." };
    const managedBrand = await validManagedBrand(sb, data.brand);
    if (managedBrand === false) return { ok: false as const, error: "Choose a brand from the managed list." };
    const { data: before } = await sb.from("products").select("*").eq("id", data.id).eq("product_kind", "part").maybeSingle();
    if (!before) return { ok: false as const, error: "Product not found." };
    const optional = (value: string) => String(value ?? "").trim() || null;
    const patch = {
      name: data.name, sku: data.sku, slug: data.slug, category_id: category.id,
      subcategory: optional(data.subcategory), brand: managedBrand, model: optional(data.model),
      price: data.price, mrp: data.mrp, stock: data.stock, reorder_threshold: data.reorderThreshold,
      rack_location: optional(data.rackLocation), status: data.status, ordering_mode: data.orderingMode || null,
      description: optional(data.description), specs: data.specs ?? {}, voltage: optional(data.voltage), ah: optional(data.ah),
      wattage: optional(data.wattage), warranty: optional(data.warranty), weight: optional(data.weight), dimensions: optional(data.dimensions),
      shipping_info: optional(data.shippingInfo), box_contents: optional(data.boxContents), hsn_code: optional(data.hsnCode),
    };
    const { error } = await sb.from("products").update(patch as never).eq("id", data.id).eq("product_kind", "part");
    if (error) return { ok: false as const, error: error.code === "23505" ? "That SKU or product URL is already in use." : error.message };
    const { error: clearTierError } = await sb.from("price_tiers").delete().eq("product_id", data.id).eq("tier", "trade").eq("min_qty", 1);
    if (clearTierError) return { ok: false as const, error: clearTierError.message };
    if (data.wholesalePrice !== null) {
      const { error: tierError } = await sb.from("price_tiers").insert({ product_id: data.id, tier: "trade", price: data.wholesalePrice, min_qty: 1 } as never);
      if (tierError) return { ok: false as const, error: tierError.message };
    }
    const { error: clearCompatibilityError } = await sb.from("product_compatibility").delete().eq("product_id", data.id);
    if (clearCompatibilityError) return { ok: false as const, error: clearCompatibilityError.message };
    if (data.compatibility.length > 0) {
      const { error: compatibilityError } = await sb.from("product_compatibility").insert(data.compatibility.map((item) => ({
        product_id: data.id, vehicle_model: item.vehicleModel, year_from: item.yearFrom, year_to: item.yearTo, variant: item.variant || null,
      })) as never);
      if (compatibilityError) return { ok: false as const, error: compatibilityError.message };
    }
    if (Number(before.stock ?? 0) <= 0 && data.stock > 0) {
      const { notifyBackInStock } = await import("@/lib/reminders.server");
      await notifyBackInStock(data.id);
    }
    await logAudit(sb as never, actor, "products.full_update", "products", data.id, { product: data.name, from: before, to: patch });
    return { ok: true as const };
  });

export const createCatalogueProduct = createServerFn({ method: "POST" })
  .inputValidator((data: {
    name: string;
    sku: string;
    category: string;
    brand?: string;
    price?: number | null;
    wholesalePrice?: number | null;
    mrp?: number | null;
    stock?: number;
    reorderThreshold?: number | null;
    rackLocation?: string;
    description?: string;
    status?: string;
  }) => ({
    name: String(data?.name ?? "").trim().slice(0, 180),
    sku: String(data?.sku ?? "").trim().toUpperCase().slice(0, 80),
    category: String(data?.category ?? "").trim(),
    brand: String(data?.brand ?? "").trim().slice(0, 120),
    price: data?.price === null || data?.price === undefined ? null : Number(data.price),
    wholesalePrice: data?.wholesalePrice === null || data?.wholesalePrice === undefined ? null : Number(data.wholesalePrice),
    mrp: data?.mrp === null || data?.mrp === undefined ? null : Number(data.mrp),
    stock: Math.max(0, Math.floor(Number(data?.stock ?? 0))),
    reorderThreshold: data?.reorderThreshold === null || data?.reorderThreshold === undefined ? null : Math.max(0, Math.floor(Number(data.reorderThreshold))),
    rackLocation: String(data?.rackLocation ?? "").trim().slice(0, 120),
    description: String(data?.description ?? "").trim().slice(0, 5000),
    status: ["visible", "draft", "hidden"].includes(String(data?.status)) ? String(data.status) : "draft",
  }))
  .handler(async ({ data }) => {
    const { requireStaff, logAudit } = await import("@/lib/staff.server");
    const actor = await requireStaff({ superAdmin: true });
    const { supabaseAdmin: sb } = await import("@/integrations/supabase/client.server");
    if (data.name.length < 2) return { ok: false as const, error: "Enter a product name." };
    if (data.price !== null && (!Number.isFinite(data.price) || data.price < 0)) return { ok: false as const, error: "Price must be zero or more." };
    if (data.wholesalePrice !== null && (!Number.isFinite(data.wholesalePrice) || data.wholesalePrice < 0)) return { ok: false as const, error: "Wholesale price must be zero or more." };
    if (data.mrp !== null && (!Number.isFinite(data.mrp) || data.mrp < 0)) return { ok: false as const, error: "MRP must be zero or more." };
    const { data: category } = await sb.from("categories").select("id, name").eq("slug", data.category).maybeSingle();
    if (!category) return { ok: false as const, error: "Choose a valid homepage category." };
    const managedBrand = await validManagedBrand(sb, data.brand);
    if (managedBrand === false) return { ok: false as const, error: "Choose a brand from the managed list." };

    const slugBase = data.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "product";
    let slug = slugBase;
    for (let suffix = 2; ; suffix++) {
      const { data: existing } = await sb.from("products").select("id").eq("slug", slug).maybeSingle();
      if (!existing) break;
      slug = `${slugBase}-${suffix}`;
    }
    let sku = data.sku;
    if (!sku) {
      const prefix = data.name.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8) || "ITEM";
      sku = `${prefix}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;
    }
    const { data: product, error } = await sb.from("products").insert({
      name: data.name,
      sku,
      slug,
      category_id: category.id,
      brand: managedBrand,
      price: data.price,
      mrp: data.mrp,
      stock: data.stock,
      reorder_threshold: data.reorderThreshold,
      rack_location: data.rackLocation || null,
      description: data.description || null,
      status: data.status,
      product_kind: "part",
    } as never).select("id").single();
    if (error) {
      const duplicate = error.code === "23505";
      return { ok: false as const, error: duplicate ? "That product code is already in use." : error.message };
    }
    if (data.wholesalePrice !== null) {
      const { error: tierError } = await sb.from("price_tiers").insert({
        product_id: product.id,
        tier: "trade",
        price: data.wholesalePrice,
        min_qty: 1,
      } as never);
      if (tierError) return { ok: false as const, error: `Product added, but wholesale price could not be saved: ${tierError.message}` };
    }
    await logAudit(sb as never, actor, "products.created", "products", product.id, {
      name: data.name,
      sku,
      category: category.name,
      status: data.status,
    });
    return { ok: true as const, id: product.id, slug };
  });

/** Permanently remove one product. Restricted to Super Admins. */
export const deleteCatalogueProduct = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string }) => ({ id: String(data?.id ?? "").trim() }))
  .handler(async ({ data }) => {
    const { requireStaff, logAudit } = await import("@/lib/staff.server");
    const actor = await requireStaff({ superAdmin: true });
    const { supabaseAdmin: sb } = await import("@/integrations/supabase/client.server");
    if (!data.id) return { ok: false as const, error: "Product not found." };

    const { data: product, error: readError } = await sb
      .from("products")
      .select("id, name, sku, categories(name)")
      .eq("id", data.id)
      .maybeSingle();
    if (readError) return { ok: false as const, error: readError.message };
    if (!product) return { ok: false as const, error: "This product has already been deleted." };

    const { error } = await sb.from("products").delete().eq("id", data.id);
    if (error) {
      if (error.code === "23503") {
        return {
          ok: false as const,
          error: "This product is linked to a booking, service request, valuation, finance request, or another retained record. Set it to Hidden instead.",
        };
      }
      return { ok: false as const, error: error.message };
    }

    const category = product.categories as { name?: string } | null;
    await logAudit(sb as never, actor, "products.deleted", "products", data.id, {
      name: product.name,
      sku: product.sku,
      category: category?.name ?? null,
    });
    return { ok: true as const };
  });

/** Save price, MRP, stock, brand and reorder level for one product. */
export const quickSaveProduct = createServerFn({ method: "POST" })
  .inputValidator((data: {
    id: string;
    price?: number | null;
    wholesalePrice?: number | null;
    mrp?: number | null;
    stock?: number;
    brand?: string | null;
    reorderThreshold?: number | null;
    status?: string;
    rackLocation?: string | null;
  }) => data)
  .handler(async ({ data }) => {
    const { sb, actor, logAudit } = await adminAs();
    const { data: before } = await sb.from("products").select("name, price, mrp, stock, brand, reorder_threshold, status, rack_location").eq("id", data.id).maybeSingle();
    const patch: Record<string, unknown> = {};
    if (data.price !== undefined) patch['price'] = data.price;
    if (data.mrp !== undefined) patch['mrp'] = data.mrp;
    if (data.stock !== undefined) patch['stock'] = Math.max(0, Number(data.stock) || 0);
    if (data.brand !== undefined) patch['brand'] = data.brand;
    if (data.reorderThreshold !== undefined) patch['reorder_threshold'] = data.reorderThreshold;
    if (data.status !== undefined && ["draft", "visible", "hidden"].includes(String(data.status))) patch['status'] = data.status;
    if (data.rackLocation !== undefined) patch['rack_location'] = String(data.rackLocation ?? "").trim().slice(0, 120) || null;
    if (Object.keys(patch).length === 0) return { ok: true as const };
    const { error } = await sb.from("products").update(patch as never).eq("id", data.id);
    if (error) return { ok: false as const, error: error.message };
    if (data.wholesalePrice !== undefined) {
      const { error: clearError } = await sb.from("price_tiers").delete().eq("product_id", data.id).eq("tier", "trade").eq("min_qty", 1);
      if (clearError) return { ok: false as const, error: clearError.message };
      if (data.wholesalePrice !== null) {
        const value = Number(data.wholesalePrice);
        if (!Number.isFinite(value) || value < 0) return { ok: false as const, error: "Wholesale price must be zero or more." };
        const { error: tierError } = await sb.from("price_tiers").insert({ product_id: data.id, tier: "trade", price: value, min_qty: 1 } as never);
        if (tierError) return { ok: false as const, error: tierError.message };
      }
    }
    if (
      data.stock !== undefined &&
      Number(before?.stock ?? 0) <= 0 &&
      Number(patch['stock'] ?? 0) > 0
    ) {
      const { notifyBackInStock } = await import("@/lib/reminders.server");
      await notifyBackInStock(data.id);
    }
    await logAudit(sb as never, actor, "products.updated", "products", data.id, {
      product: before?.name ?? data.id,
      from: before ?? null,
      to: patch,
    });
    return { ok: true as const };
  });

/** Replace the photo list of a product, in the given order. */
export const setProductImages = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string; urls: string[] }) => ({
    id: String(data?.id ?? ""),
    urls: (Array.isArray(data?.urls) ? data.urls : []).map((u) => String(u).trim()).filter(Boolean).slice(0, 8),
  }))
  .handler(async ({ data }) => {
    const { sb, actor, logAudit } = await adminAs();
    await sb.from("product_images").delete().eq("product_id", data.id);
    if (data.urls.length > 0) {
      const { error } = await sb
        .from("product_images")
        .insert(data.urls.map((url, i) => ({ product_id: data.id, url, sort_order: i })) as never);
      if (error) return { ok: false as const, error: error.message };
    }
    await logAudit(sb as never, actor, "products.photos_changed", "products", data.id, { photos: data.urls.length });
    return { ok: true as const };
  });

/* ---------------------------------- CSV ---------------------------------- */

const csvCell = (v: unknown) => {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export const exportCatalogueCsv = createServerFn({ method: "POST" }).handler(async (): Promise<{ csv: string; rows: number }> => {
  const { sb } = await adminAs();
  const { data: rows, error } = await sb
    .from("products")
    .select("sku, name, brand, price, mrp, stock, reorder_threshold, hsn_code, categories!inner(slug)")
    .order("name")
    .limit(5000);
  if (error) throw new Error(error.message);
  const header = ["sku", "name", "category", "brand", "price", "mrp", "stock", "reorder_threshold", "hsn_code"];
  const lines = [header.join(",")];
  for (const r of (rows ?? []) as Row[]) {
    lines.push(
      [
        r['sku'],
        r['name'],
        r['categories']?.['slug'],
        r['brand'],
        r['price'],
        r['mrp'],
        r['stock'],
        r['reorder_threshold'],
        r['hsn_code'],
      ]
        .map(csvCell)
        .join(","),
    );
  }
  return { csv: lines.join("\n"), rows: (rows ?? []).length };
});

export type CsvChange = {
  sku: string;
  name: string;
  field: string;
  from: string;
  to: string;
};

export type CsvPreview = {
  changes: CsvChange[];
  unknownSkus: string[];
  unchanged: number;
  rows: number;
  error?: string;
};

type ParsedRow = { sku: string; price?: number | null; mrp?: number | null; stock?: number; brand?: string | null; reorder?: number | null; hsn?: string | null };

function parseCsv(text: string): { rows: ParsedRow[]; error?: string } {
  const lines = text.split(/\r?\n/).filter((l) => l.trim() !== "");
  if (lines.length < 2) return { rows: [], error: "The file has no product rows." };

  const split = (line: string) => {
    const out: string[] = [];
    let cur = "";
    let quoted = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (quoted) {
        if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; }
        else if (c === '"') quoted = false;
        else cur += c;
      } else if (c === '"') quoted = true;
      else if (c === ",") { out.push(cur); cur = ""; }
      else cur += c;
    }
    out.push(cur);
    return out.map((s) => s.trim());
  };

  const header = split(lines[0]!).map((h) => h.toLowerCase().replace(/\s+/g, "_"));
  const idx = (name: string) => header.indexOf(name);
  const skuAt = idx("sku");
  if (skuAt < 0) return { rows: [], error: "The file needs a column called sku." };

  const numAt = (cells: string[], at: number): number | null | undefined => {
    if (at < 0) return undefined;
    const raw = (cells[at] ?? "").replace(/[₹,\s]/g, "");
    if (raw === "") return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : undefined;
  };

  const rows: ParsedRow[] = [];
  for (const line of lines.slice(1, 5001)) {
    const cells = split(line);
    const sku = cells[skuAt] ?? "";
    if (!sku) continue;
    const row: ParsedRow = { sku };
    const price = numAt(cells, idx("price"));
    if (price !== undefined) row.price = price;
    const mrp = numAt(cells, idx("mrp"));
    if (mrp !== undefined) row.mrp = mrp;
    const stock = numAt(cells, idx("stock"));
    if (stock !== undefined && stock !== null) row.stock = Math.max(0, Math.round(stock));
    const reorder = numAt(cells, idx("reorder_threshold"));
    if (reorder !== undefined) row.reorder = reorder === null ? null : Math.max(0, Math.round(reorder));
    const brandAt = idx("brand");
    if (brandAt >= 0) row.brand = (cells[brandAt] ?? "").trim() || null;
    const hsnAt = idx("hsn_code");
    if (hsnAt >= 0) row.hsn = (cells[hsnAt] ?? "").trim() || null;
    rows.push(row);
  }
  return { rows };
}

async function diffCsv(text: string) {
  const { sb } = await adminAs();
  const { rows, error } = parseCsv(text);
  if (error) return { error, rows: [] as ParsedRow[], byId: new Map<string, Row>(), changes: [] as CsvChange[], unknown: [] as string[], unchanged: 0 };

  const skus = rows.map((r) => r.sku);
  const existing: Row[] = [];
  for (let i = 0; i < skus.length; i += 400) {
    const { data } = await sb
      .from("products")
      .select("id, sku, name, brand, price, mrp, stock, reorder_threshold, hsn_code")
      .in("sku", skus.slice(i, i + 400));
    existing.push(...((data ?? []) as Row[]));
  }
  const bySku = new Map(existing.map((p) => [String(p['sku']), p]));

  const changes: CsvChange[] = [];
  const unknown: string[] = [];
  let unchanged = 0;

  const show = (v: unknown) => (v === null || v === undefined || v === "" ? "—" : String(v));

  for (const r of rows) {
    const p = bySku.get(r.sku);
    if (!p) { unknown.push(r.sku); continue; }
    let touched = false;
    const cmp = (field: string, current: unknown, next: unknown) => {
      if (next === undefined) return;
      const a = current === null || current === undefined ? null : String(Number.isFinite(Number(current)) && current !== "" ? Number(current) : current);
      const b = next === null ? null : String(Number.isFinite(Number(next)) && next !== "" ? Number(next) : next);
      if (a !== b) {
        changes.push({ sku: r.sku, name: String(p['name']), field, from: show(current), to: show(next) });
        touched = true;
      }
    };
    cmp("price", p['price'], r.price);
    cmp("mrp", p['mrp'], r.mrp);
    cmp("stock", p['stock'], r.stock);
    cmp("brand", p['brand'], r.brand);
    cmp("reorder level", p['reorder_threshold'], r.reorder);
    cmp("hsn code", p['hsn_code'], r.hsn);
    if (!touched) unchanged++;
  }

  return { rows, byId: bySku, changes, unknown, unchanged };
}

/** Show what a CSV would change, without touching anything. */
export const previewCatalogueCsv = createServerFn({ method: "POST" })
  .inputValidator((data: { csv: string }) => ({ csv: String(data?.csv ?? "").slice(0, 4_000_000) }))
  .handler(async ({ data }): Promise<CsvPreview> => {
    const res = await diffCsv(data.csv);
    if (res.error) return { changes: [], unknownSkus: [], unchanged: 0, rows: 0, error: res.error };
    return {
      changes: res.changes.slice(0, 500),
      unknownSkus: res.unknown.slice(0, 50),
      unchanged: res.unchanged,
      rows: res.rows.length,
    };
  });

/** Apply a CSV after the owner has seen the preview. */
export const applyCatalogueCsv = createServerFn({ method: "POST" })
  .inputValidator((data: { csv: string }) => ({ csv: String(data?.csv ?? "").slice(0, 4_000_000) }))
  .handler(async ({ data }) => {
    const { sb, actor, logAudit } = await adminAs();
    const res = await diffCsv(data.csv);
    if (res.error) return { ok: false as const, error: res.error };

    const touched = new Set(res.changes.map((c) => c.sku));
    let saved = 0;
    for (const r of res.rows) {
      if (!touched.has(r.sku)) continue;
      const p = res.byId.get(r.sku);
      if (!p) continue;
      const patch: Record<string, unknown> = {};
      if (r.price !== undefined) patch['price'] = r.price;
      if (r.mrp !== undefined) patch['mrp'] = r.mrp;
      if (r.stock !== undefined) patch['stock'] = r.stock;
      if (r.brand !== undefined) patch['brand'] = r.brand;
      if (r.reorder !== undefined) patch['reorder_threshold'] = r.reorder;
      if (r.hsn !== undefined) patch['hsn_code'] = r.hsn;
      if (Object.keys(patch).length === 0) continue;
      await sb.from("products").update(patch as never).eq("id", String(p['id']));
      saved++;
    }
    await logAudit(sb as never, actor, "products.csv_import", "products", null, {
      saved,
      changes: res.changes.slice(0, 50),
    });
    return { ok: true as const, saved, skipped: res.unknown.length };
  });
