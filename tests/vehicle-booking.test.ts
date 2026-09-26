import { afterAll, describe, expect, it } from "vitest";
import { createClient } from "@supabase/supabase-js";

const url = process.env['SUPABASE_URL']!;
const anonKey = process.env['SUPABASE_PUBLISHABLE_KEY'] ?? process.env['SUPABASE_ANON_KEY']!;
const serviceKey = process.env['SUPABASE_SERVICE_ROLE_KEY']!;

const anon = createClient(url, anonKey, { auth: { persistSession: false } });
const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

const suffix = Math.random().toString(36).slice(2, 8);
const slug = `test-scooter-${suffix}`;
const cleanup: string[] = [];

async function makeVehicle(price: { ex: number; rto: number; ins: number; acc: number; sub: number; token: number }) {
  const { data, error } = await admin
    .from("products")
    .insert({
      sku: `TESTEV-${suffix.toUpperCase()}`,
      slug,
      name: `Test Scooter ${suffix}`,
      product_kind: "vehicle",
      status: "visible",
      stock: 3,
      specs: {},
    } as never)
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  cleanup.push(data!.id);

  await admin.from("vehicle_specs").insert({
    product_id: data!.id,
    variant: "Test variant",
    colours: ["Red", "Black"],
    certified_range: "110 km",
    top_speed: "65 kmph",
  } as never);
  await admin.from("vehicle_pricing").insert({
    product_id: data!.id,
    ex_showroom: price.ex,
    rto: price.rto,
    insurance: price.ins,
    accessories: price.acc,
    subsidy: price.sub,
    token_amount: price.token,
  } as never);
  return data!.id;
}

afterAll(async () => {
  for (const id of cleanup) {
    await admin.from("vehicle_bookings").delete().eq("product_id", id);
    await admin.from("vehicle_pricing").delete().eq("product_id", id);
    await admin.from("vehicle_specs").delete().eq("product_id", id);
    await admin.from("products").delete().eq("id", id);
  }
});

describe("a whole scooter is not a spare part", () => {
  it("adds up the on-road price from its itemised lines", async () => {
    const id = await makeVehicle({ ex: 90000, rto: 6000, ins: 4500, acc: 2000, sub: 10000, token: 5000 });
    const { data } = await admin.from("vehicle_pricing").select("on_road").eq("product_id", id).single();
    expect(Number(data!.on_road)).toBe(90000 + 6000 + 4500 + 2000 - 10000);
  });

  it("is kept out of the parts listing", async () => {
    const { data } = await anon
      .from("products")
      .select("slug")
      .eq("status", "visible")
      .eq("product_kind", "part")
      .eq("slug", slug);
    expect(data ?? []).toHaveLength(0);
  });

  it("is visible in the scooters listing", async () => {
    const { data, error } = await anon
      .from("products")
      .select("slug, vehicle_specs(certified_range), vehicle_pricing(on_road)")
      .eq("status", "visible")
      .eq("product_kind", "vehicle")
      .eq("slug", slug);
    expect(error).toBeNull();
    expect(data ?? []).toHaveLength(1);
  });

  it("never exposes the shelf location of a scooter to a visitor", async () => {
    const { error } = await anon.from("products").select("rack_location").eq("slug", slug);
    expect(error).toBeTruthy();
  });
});

describe("booking track", () => {
  it("keeps the token within the on-road price and leaves the rest as balance", async () => {
    const { data: product } = await admin.from("products").select("id").eq("slug", slug).single();
    const { data: price } = await admin.from("vehicle_pricing").select("on_road, token_amount").eq("product_id", product!.id).single();
    const onRoad = Number(price!.on_road);
    const token = Math.min(Number(price!.token_amount), onRoad);

    const humanId = `SCB-TEST-${suffix.toUpperCase()}`;
    const { data: booking, error } = await admin
      .from("vehicle_bookings")
      .insert({
        human_id: humanId,
        product_id: product!.id,
        customer_name: "Test Buyer",
        phone: "9999999999",
        alternate_phone: "9888888888",
        price_breakdown: {},
        on_road_total: onRoad,
        token_amount: token,
        balance_due: onRoad - token,
      } as never)
      .select("id, public_token, status, balance_due, alternate_phone")
      .single();
    expect(error).toBeNull();
    expect(booking!.status).toBe("booked");
    expect(Number(booking!.balance_due)).toBe(onRoad - token);
    expect(booking!.alternate_phone).toBe("9888888888");

    await admin.from("booking_events").insert({ booking_id: booking!.id, status: "allotted", note: "Allotted" } as never);
    const { data: view, error: viewError } = await anon.rpc("booking_by_token", { p_token: booking!.public_token });
    expect(viewError).toBeNull();
    const row = (Array.isArray(view) ? view[0] : view) as Record<string, unknown>;
    expect(row['human_id']).toBe(humanId);
    expect(Object.keys(row)).not.toContain("rack_location");
  });

  it("gives nothing away for an unknown booking link", async () => {
    const { data, error } = await anon.rpc("booking_by_token", { p_token: "00000000-0000-0000-0000-000000000000" });
    expect(error).toBeNull();
    expect((data ?? []).length).toBe(0);
  });
});
