import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createClient } from "@supabase/supabase-js";

const admin = createClient(process.env['SUPABASE_URL'] ?? "", process.env['SUPABASE_SERVICE_ROLE_KEY'] ?? "", { auth: { persistSession: false } });
const anon = createClient(process.env['SUPABASE_URL'] ?? "", process.env['SUPABASE_PUBLISHABLE_KEY'] ?? "", { auth: { persistSession: false } });
const tag = `QA-SHOWROOM-${Date.now()}`;
let actor = "";
let bookingId = "";
let receiptId = "";
let productId = "";
const lines = [{ label: "QA vehicle", kind: "vehicle", amount: 100 }];

beforeAll(async () => {
  const { data: roles, error } = await admin.from("staff_roles").select("profile_id").in("role", ["super_admin", "owner"]).limit(1);
  if (error || !roles?.[0]) throw new Error("Showroom tests require an Owner test actor");
  actor = roles[0].profile_id;
  const result = await admin.from("products").insert({ sku: tag, slug: tag.toLowerCase(), name: tag, product_kind: "vehicle", status: "visible", stock: 0, specs: {} }).select("id").single();
  if (result.error || !result.data) throw new Error(result.error?.message ?? "Missing fixture");
  productId = result.data.id;
});
afterAll(async () => {
  // Auditable test history follows the same void-only rule as real receipts.
  if (receiptId) await admin.rpc("void_booking_receipt", { p_receipt_id: receiptId, p_reason: "QA fixture cleanup", p_actor_id: actor, p_actor_name: tag });
  if (bookingId) await admin.from("vehicle_bookings").update({ status: "cancelled" }).eq("id", bookingId);
  if (productId) await admin.from("products").update({ status: "hidden" }).eq("id", productId);
});

describe("showroom booking receipts and handover", () => {
  it("creates one showroom row with no token and full outstanding", async () => {
    const r = await admin.rpc("create_showroom_booking", { p_product_id: productId, p_customer: { name: tag, phone: "9999999999" }, p_lines: lines, p_discount: 0, p_discount_reason: "", p_expected_delivery: null, p_actor_id: actor, p_actor_name: tag });
    expect(r.error).toBeNull(); bookingId = r.data.id;
    const { data } = await admin.from("vehicle_bookings").select("sale_kind, token_amount, balance_due, payment_status, price_breakdown, profile_id").eq("id", bookingId).single();
    expect(data?.sale_kind).toBe("showroom"); expect(Number(data?.token_amount)).toBe(0); expect(Number(data?.balance_due)).toBe(100); expect(data?.payment_status).toBe("pending"); expect(data?.profile_id).toBeNull(); expect(data?.price_breakdown).toEqual(lines);
  });
  it("records a partial receipt without changing online payment status", async () => {
    const r = await admin.rpc("record_booking_receipt", { p_booking_id: bookingId, p_amount: 25, p_payer_type: "customer", p_method: "other", p_reference: "QA non-cash fixture", p_received_on: null, p_note: tag, p_actor_id: actor, p_actor_name: tag });
    expect(r.error).toBeNull(); receiptId = r.data;
    const { data } = await admin.from("vehicle_bookings").select("balance_due, payment_status").eq("id", bookingId).single();
    expect(Number(data?.balance_due)).toBe(75); expect(data?.payment_status).toBe("pending");
  });
  it("rejects a receipt above the 75 rupee outstanding", async () => {
    const r = await admin.rpc("record_booking_receipt", { p_booking_id: bookingId, p_amount: 76, p_payer_type: "customer", p_method: "other", p_reference: "", p_received_on: null, p_note: tag, p_actor_id: actor, p_actor_name: tag });
    expect(r.error?.message).toContain("exceeds outstanding");
  });
  it("blocks direct delivered status and handover without an Owner reason", async () => {
    const direct = await admin.from("vehicle_bookings").update({ status: "delivered" }).eq("id", bookingId);
    expect(direct.error?.message).toContain("Owner");
    const r = await admin.rpc("deliver_booking_with_balance", { p_booking_id: bookingId, p_chassis: tag, p_motor: tag, p_registration: "", p_battery: "", p_warranty: null, p_delivered: null, p_override_reason: "", p_actor_id: actor, p_actor_name: tag });
    expect(r.error?.message).toContain("Outstanding balance of ₹75");
  });
  it("voids rather than deletes and restores the outstanding", async () => {
    const deletion = await admin.from("booking_receipts").delete().eq("id", receiptId);
    expect(deletion.error?.message).toContain("cannot be deleted");
    const r = await admin.rpc("void_booking_receipt", { p_receipt_id: receiptId, p_reason: "QA verification void", p_actor_id: actor, p_actor_name: tag });
    expect(r.error).toBeNull();
    const { data } = await admin.from("vehicle_bookings").select("balance_due, payment_status").eq("id", bookingId).single();
    expect(Number(data?.balance_due)).toBe(100); expect(data?.payment_status).toBe("pending");
    const twice = await admin.rpc("void_booking_receipt", { p_receipt_id: receiptId, p_reason: "QA second void", p_actor_id: actor, p_actor_name: tag });
    expect(twice.error?.message).toContain("already voided");
  });
  it("does not expose privileged receipt routines to visitors", async () => {
    const r = await anon.rpc("booking_outstanding", { p_booking_id: bookingId });
    expect(r.error).toBeTruthy();
  });
});
