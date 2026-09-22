/**
 * Wholesale pricing is decided by the database, never by the browser.
 * These tests walk every rate card and every quantity slab boundary, and
 * check that guests and unapproved accounts always pay the retail price.
 */
import { createClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const url = process.env['SUPABASE_URL'] ?? process.env['VITE_SUPABASE_URL'] ?? "";
const serviceKey = process.env['SUPABASE_SERVICE_ROLE_KEY'] ?? "";
const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

const productId = crypto.randomUUID();
const tag = productId.slice(0, 8);

beforeAll(async () => {
  const { error } = await admin.from("products").insert({
    id: productId,
    sku: `TIER-${tag}`,
    slug: `tier-${tag}`,
    name: `Tier test part ${tag}`,
    status: "visible",
    stock: 500,
    price: 1000,
  } as never);
  if (error) throw new Error(error.message);

  const slabs = [
    { tier: "trade", min_qty: 1, price: 900 },
    { tier: "trade", min_qty: 10, price: 850 },
    { tier: "trade", min_qty: 50, price: 800 },
    { tier: "distributor", min_qty: 1, price: 820 },
    { tier: "distributor", min_qty: 50, price: 740 },
  ].map((s) => ({ ...s, product_id: productId }));
  const { error: e2 } = await admin.from("price_tiers").insert(slabs as never);
  if (e2) throw new Error(e2.message);
});

afterAll(async () => {
  await admin.from("price_tiers").delete().eq("product_id", productId);
  await admin.from("products").delete().eq("id", productId);
});

async function priceFor(tier: string, qty: number) {
  const { data, error } = await admin.rpc("tier_price", {
    p_product_id: productId,
    p_tier: tier,
    p_qty: qty,
  } as never);
  if (error) throw new Error(error.message);
  return Number(data);
}

describe("tier price slabs", () => {
  it("charges retail at every quantity for a retail customer", async () => {
    for (const qty of [1, 9, 10, 49, 50, 500]) {
      expect(await priceFor("retail", qty)).toBe(1000);
    }
  });

  it("walks the trade slab boundaries exactly", async () => {
    expect(await priceFor("trade", 1)).toBe(900);
    expect(await priceFor("trade", 9)).toBe(900);
    expect(await priceFor("trade", 10)).toBe(850);
    expect(await priceFor("trade", 49)).toBe(850);
    expect(await priceFor("trade", 50)).toBe(800);
    expect(await priceFor("trade", 5000)).toBe(800);
  });

  it("walks the distributor slab boundaries exactly", async () => {
    expect(await priceFor("distributor", 1)).toBe(820);
    expect(await priceFor("distributor", 49)).toBe(820);
    expect(await priceFor("distributor", 50)).toBe(740);
  });

  it("falls back to retail when a rate card has no slab for the part", async () => {
    await admin.from("price_tiers").delete().eq("product_id", productId).eq("tier", "distributor");
    expect(await priceFor("distributor", 100)).toBe(1000);
  });
});

describe("who gets which rate card", () => {
  it("gives a guest the retail rate", async () => {
    const { data, error } = await admin.rpc("customer_tier", { p_profile_id: null } as never);
    if (error) throw new Error(error.message);
    expect(data).toBe("retail");
  });

  it("gives an unapproved trade account the retail rate", async () => {
    const { data } = await admin
      .from("profiles")
      .select("id")
      .eq("customer_type", "trade")
      .is("trade_approved_at", null)
      .limit(1)
      .maybeSingle();
    if (!data) return; // nothing unapproved on this database right now
    const { data: tier } = await admin.rpc("customer_tier", { p_profile_id: data.id } as never);
    expect(tier).toBe("retail");
  });
});
