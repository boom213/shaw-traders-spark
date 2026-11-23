import { describe, expect, it } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { ilikeAny, safeSearchTerm } from "@/lib/postgrest-filter";
import { trustedSiteOrigin } from "@/lib/site-origin";
import { isOwnTradeDocPath } from "@/lib/trade-doc-path";

const url = process.env['SUPABASE_URL']!;
const anonKey = process.env['SUPABASE_PUBLISHABLE_KEY'] ?? process.env['SUPABASE_ANON_KEY']!;
const serviceKey = process.env['SUPABASE_SERVICE_ROLE_KEY']!;
const anon = createClient(url, anonKey, { auth: { persistSession: false } });
const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
const someId = "00000000-0000-0000-0000-000000000001";

describe("search text cannot change database filters", () => {
  it("strips filter syntax from the typed text", () => {
    expect(safeSearchTerm('a,id.not.is.null)(%_*"\\')).toBe("a id.not.is.null");
  });
  it("quotes the value so it stays one filter per column", () => {
    expect(ilikeAny(["name", "sku"], "brake,status.eq.x")).toBe('name.ilike."%brake status.eq.x%",sku.ilike."%brake status.eq.x%"');
  });
  it("returns no filter for empty text", () => {
    expect(ilikeAny(["name"], " ,() ")).toBeNull();
  });
});

describe("confirmation links only go to the shop's own sites", () => {
  it("keeps the main site", () => {
    expect(trustedSiteOrigin("https://www.shawtradersev.com")).toBe("https://www.shawtradersev.com");
  });
  it("replaces an unknown site with the main site", () => {
    expect(trustedSiteOrigin("https://evil.example")).toBe("https://shawtradersev.com");
  });
  it("rejects look-alike hosts", () => {
    expect(trustedSiteOrigin("https://shawtradersev.com.evil.example")).toBe("https://shawtradersev.com");
  });
});

describe("applicants can only delete their own documents", () => {
  const me = "11111111-1111-1111-1111-111111111111";
  it("allows a file in their own folder", () => {
    expect(isOwnTradeDocPath(`${me}/pan_card_path-abc.jpg`, me)).toBe(true);
  });
  it("refuses another person's file", () => {
    expect(isOwnTradeDocPath("22222222-2222-2222-2222-222222222222/x.jpg", me)).toBe(false);
  });
  it("refuses path tricks", () => {
    expect(isOwnTradeDocPath(`${me}/../other/x.jpg`, me)).toBe(false);
  });
});

describe("private database helpers are server-only", () => {
  it.each([
    ["trade_balance", { _profile_id: someId }],
    ["trade_overdue", { _profile_id: someId }],
    ["customer_tier", { _user_id: someId }],
    ["tier_price", { p_product: someId, p_tier: "distributor", p_qty: 1 }],
    ["build_service_schedule", { p_registration: someId }],
  ])("refuses a visitor calling %s", async (fn, args) => {
    const { error } = await anon.rpc(fn as never, args as never);
    expect(error).toBeTruthy();
  });

  it("does not reveal someone else's staff role to a visitor", async () => {
    const { data: row } = await admin.from("staff_roles").select("profile_id").limit(1).single();
    const { data } = await anon.rpc("staff_role", { _user_id: row!.profile_id });
    expect(data).toBeNull();
  });

  it("still lets the server read a staff role", async () => {
    const { data: row } = await admin.from("staff_roles").select("profile_id").limit(1).single();
    const { data } = await admin.rpc("staff_role", { _user_id: row!.profile_id });
    expect(data).toBeTruthy();
  });

  it("refuses a visitor creating an order directly", async () => {
    const { error } = await anon.from("orders").insert({ human_id: "PROBE", subtotal: 1, total: 1, address: {}, payment_status: "paid" } as never);
    expect(error).toBeTruthy();
  });
});
