import { afterAll, describe, expect, it } from "vitest";
import { createClient } from "@supabase/supabase-js";

const url = process.env['SUPABASE_URL']!;
const anonKey = process.env['SUPABASE_PUBLISHABLE_KEY'] ?? process.env['SUPABASE_ANON_KEY']!;
const serviceKey = process.env['SUPABASE_SERVICE_ROLE_KEY']!;
const anon = createClient(url, anonKey, { auth: { persistSession: false } });
const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
const marker = `direct-write-probe-${Date.now()}`;

afterAll(async () => {
  await admin.from("product_enquiries").delete().eq("name", marker);
  await admin.from("stock_alerts").delete().eq("contact", `${marker}@example.com`);
});

describe("enquiries and stock alerts are saved only by the server", () => {
  it("refuses a visitor writing an enquiry directly", async () => {
    const { error } = await anon.from("product_enquiries").insert({ name: marker, phone: "9999999999", qty: 1, status: "new" });
    expect(error).toBeTruthy();
    const { data } = await admin.from("product_enquiries").select("id").eq("name", marker);
    expect(data ?? []).toHaveLength(0);
  });

  it("refuses a visitor writing a stock alert directly", async () => {
    const { data: p } = await admin.from("products").select("id").limit(1).single();
    const { error } = await anon.from("stock_alerts").insert({ product_id: p!.id, channel: "email", contact: `${marker}@example.com` });
    expect(error).toBeTruthy();
    const { data } = await admin.from("stock_alerts").select("id").eq("contact", `${marker}@example.com`);
    expect(data ?? []).toHaveLength(0);
  });
});
