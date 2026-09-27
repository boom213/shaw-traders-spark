import { createClient } from "@supabase/supabase-js";
import { afterAll, describe, expect, it } from "vitest";

const url = process.env['SUPABASE_URL'] ?? process.env['VITE_SUPABASE_URL'] ?? "";
const serviceKey = process.env['SUPABASE_SERVICE_ROLE_KEY'] ?? "";
const anonKey = process.env['SUPABASE_PUBLISHABLE_KEY'] ?? process.env['VITE_SUPABASE_PUBLISHABLE_KEY'] ?? "";

const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
const anon = createClient(url, anonKey, { auth: { persistSession: false } });

const categoryIds: string[] = [];
const productIds: string[] = [];

afterAll(async () => {
  if (productIds.length > 0) await admin.from("products").delete().in("id", productIds);
  if (categoryIds.length > 0) await admin.from("categories").delete().in("id", categoryIds);
});

describe("public product search", () => {
  it("matches category terms and excludes hidden products and vehicles", async () => {
    const marker = crypto.randomUUID().slice(0, 8);
    const categoryId = crypto.randomUUID();
    categoryIds.push(categoryId);
    const categoryTerm = `motor${marker}`;

    const { error: categoryError } = await admin.from("categories").insert({
      id: categoryId,
      slug: categoryTerm,
      name: `Motor ${marker}`,
      sort_order: 999,
    });
    if (categoryError) throw new Error(categoryError.message);

    const products = [
      { id: crypto.randomUUID(), name: `Visible assembly ${marker}`, status: "visible", product_kind: "part" },
      { id: crypto.randomUUID(), name: `Hidden assembly ${marker}`, status: "hidden", product_kind: "part" },
      { id: crypto.randomUUID(), name: `Vehicle assembly ${marker}`, status: "visible", product_kind: "vehicle" },
    ] as const;
    productIds.push(...products.map((product) => product.id));

    const { error: productError } = await admin.from("products").insert(
      products.map((product) => ({
        ...product,
        category_id: categoryId,
        sku: `SEARCH-${product.id.slice(0, 8)}`,
        slug: `search-${product.id}`,
        stock: 5,
        price: 100,
      })) as never,
    );
    if (productError) throw new Error(productError.message);

    const { data, error } = await anon.rpc("search_product_ids", { p_term: categoryTerm, p_limit: 20 });
    expect(error).toBeNull();

    const ids = (data ?? []).filter((hit) => hit.score >= 0.28).map((hit) => hit.id);
    expect(ids).toContain(products[0].id);
    expect(ids).not.toContain(products[1].id);
    expect(ids).not.toContain(products[2].id);
  });
});