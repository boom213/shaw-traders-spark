import { describe, expect, it } from "vitest";
import { createClient } from "@supabase/supabase-js";

const url = process.env['SUPABASE_URL']!;
const anonKey = process.env['SUPABASE_PUBLISHABLE_KEY'] ?? process.env['SUPABASE_ANON_KEY']!;
const serviceKey = process.env['SUPABASE_SERVICE_ROLE_KEY']!;

const anon = createClient(url, anonKey, { auth: { persistSession: false } });
const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

describe("rack location stays inside the shop", () => {
  it("is never returned to an anonymous visitor", async () => {
    const { data, error } = await anon.from("products").select("rack_location").limit(1);
    expect(error, "anon must not be able to read rack_location").toBeTruthy();
    expect(data).toBeFalsy();
  });

  it("is still readable with the shop's own key", async () => {
    const { error } = await admin.from("products").select("rack_location").limit(1);
    expect(error).toBeNull();
  });

  it("is absent from the ordinary public product columns", async () => {
    const { data, error } = await anon
      .from("products")
      .select("id, name, slug, price, stock")
      .eq("status", "visible")
      .limit(1);
    expect(error).toBeNull();
    if (data?.[0]) expect(Object.keys(data[0])).not.toContain("rack_location");
  });
});

describe("fitment detail", () => {
  it("records year and variant alongside the model", async () => {
    const { error } = await admin.from("product_compatibility").select("vehicle_model, year_from, year_to, variant").limit(1);
    expect(error).toBeNull();
  });
});

describe("quote links", () => {
  it("returns nothing for a token that does not exist", async () => {
    const { data, error } = await anon.rpc("quote_by_token", { p_token: "00000000-0000-0000-0000-000000000000" });
    expect(error).toBeNull();
    expect((data ?? []).length).toBe(0);
  });
});
