/**
 * Product status controls what the public sees, and the shelf (rack) location
 * must never leave the shop floor: an anonymous request must not be able to
 * read it, by column or by filter.
 */
import { createClient } from "@supabase/supabase-js";
import { afterAll, describe, expect, it } from "vitest";
import { effectiveMode } from "../src/lib/ordering";

const url = process.env['SUPABASE_URL'] ?? process.env['VITE_SUPABASE_URL'] ?? "";
const serviceKey = process.env['SUPABASE_SERVICE_ROLE_KEY'] ?? "";
const anonKey = process.env['VITE_SUPABASE_PUBLISHABLE_KEY'] ?? process.env['SUPABASE_PUBLISHABLE_KEY'] ?? "";

const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
const anon = createClient(url, anonKey, { auth: { persistSession: false } });

const productIds: string[] = [];

async function makeProduct(status: "draft" | "visible" | "hidden") {
  const id = crypto.randomUUID();
  const tag = id.slice(0, 8);
  const { error } = await admin.from("products").insert({
    id,
    sku: `TEST-${tag}`,
    slug: `test-${tag}`,
    name: `Test part ${tag}`,
    status,
    stock: 5,
    price: 100,
    rack_location: `A-3 / Rack 2 / Bin ${tag}`,
  } as never);
  if (error) throw new Error(error.message);
  productIds.push(id);
  return id;
}

afterAll(async () => {
  if (productIds.length) await admin.from("products").delete().in("id", productIds);
});

describe("ordering mode resolution", () => {
  it("prefers the product setting, then the category, then the site", () => {
    expect(effectiveMode({ site: "full", category: "browse", product: "enquiry" })).toBe("enquiry");
    expect(effectiveMode({ site: "full", category: "browse", product: null })).toBe("browse");
    expect(effectiveMode({ site: "enquiry", category: null, product: null })).toBe("enquiry");
    expect(effectiveMode({})).toBe("full");
  });
});

describe("public catalogue visibility", () => {
  it("shows visible products and hides draft and hidden ones", async () => {
    const visible = await makeProduct("visible");
    const draft = await makeProduct("draft");
    const hidden = await makeProduct("hidden");

    const { data } = await anon.from("products").select("id").in("id", [visible, draft, hidden]);
    const ids = (data ?? []).map((r) => r.id);
    expect(ids).toContain(visible);
    expect(ids).not.toContain(draft);
    expect(ids).not.toContain(hidden);
  });

  it("never returns the shelf location to an anonymous request", async () => {
    const id = await makeProduct("visible");

    const direct = await anon.from("products").select("id, rack_location").eq("id", id);
    expect(direct.error).not.toBeNull();
    expect(JSON.stringify(direct.data ?? "")).not.toContain("Rack 2");

    const wide = await anon.from("products").select("*").eq("id", id);
    expect(JSON.stringify(wide.data ?? [])).not.toContain("rack_location");

    const filtered = await anon.from("products").select("id").not("rack_location", "is", null).eq("id", id);
    expect(filtered.error).not.toBeNull();
  });
});
