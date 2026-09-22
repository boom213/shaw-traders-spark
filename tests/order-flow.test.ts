/**
 * Integration tests for the money path: create_order, mark_order_paid and
 * release_order run against the real database with the service role, on
 * throwaway products that are deleted afterwards.
 */
import { createClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const url = process.env['SUPABASE_URL'] ?? process.env['VITE_SUPABASE_URL'] ?? "";
const serviceKey = process.env['SUPABASE_SERVICE_ROLE_KEY'] ?? "";
const sb = createClient(url, serviceKey, { auth: { persistSession: false } });

const TAG = `test-${Date.now()}`;
const created = { productIds: [] as string[], orderIds: [] as string[], couponIds: [] as string[] };
let categoryId = "";
let settingsBackup: Record<string, unknown> | null = null;

const address = { name: "Test Buyer", phone: "9999999999", line1: "1 Test Road", city: "Bud Bud", pincode: "713403" };

async function makeProduct(price: number, stock: number) {
  const { data, error } = await sb
    .from("products")
    .insert({
      category_id: categoryId,
      sku: `${TAG}-${Math.random().toString(36).slice(2, 8)}`.toUpperCase(),
      slug: `${TAG}-${Math.random().toString(36).slice(2, 8)}`,
      name: `Test part ${TAG}`,
      price,
      stock,
      is_active: true,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  created.productIds.push(data.id);
  return data.id as string;
}

async function stockOf(id: string) {
  const { data } = await sb.from("products").select("stock").eq("id", id).single();
  return data?.stock as number;
}

async function placeOrder(items: { product_id: string; qty: number }[], method: string, coupon?: string) {
  const { data, error } = await sb.rpc("create_order", {
    p_items: items,
    p_address: address,
    p_payment_method: method,
    p_shipping_code: "standard",
    p_coupon_code: coupon ?? undefined,
  });
  if (error) return { error: error.message };
  const row = Array.isArray(data) ? data[0] : data;
  if (row?.order_id) created.orderIds.push(row.order_id);
  return { row };
}

beforeAll(async () => {
  expect(url, "SUPABASE_URL must be set").toBeTruthy();
  expect(serviceKey, "SUPABASE_SERVICE_ROLE_KEY must be set").toBeTruthy();

  const { data: cat } = await sb.from("categories").select("id").limit(1).single();
  categoryId = cat!.id;

  const { data: s } = await sb.from("shop_settings").select("*").maybeSingle();
  settingsBackup = s ?? null;
  await sb
    .from("shop_settings")
    .upsert({ id: true, gst_enabled: true, gst_rate: 18, prices_include_gst: true, cod_enabled: true, cod_limit: 2000, cod_pincodes: [] });
});

afterAll(async () => {
  if (created.orderIds.length) {
    await sb.from("order_items").delete().in("order_id", created.orderIds);
    await sb.from("order_events").delete().in("order_id", created.orderIds);
    await sb.from("orders").delete().in("id", created.orderIds);
  }
  if (created.productIds.length) await sb.from("products").delete().in("id", created.productIds);
  if (created.couponIds.length) await sb.from("coupons").delete().in("id", created.couponIds);
  if (settingsBackup) await sb.from("shop_settings").upsert(settingsBackup);
});

describe("create_order", () => {
  it("prices the order from the database, not from the browser", async () => {
    const id = await makeProduct(1000, 5);
    const { row } = await placeOrder([{ product_id: id, qty: 2 }], "Cash on Delivery");
    expect(row.total).toBe(2000);
    const { data: items } = await sb.from("order_items").select("price_snapshot, qty").eq("order_id", row.order_id);
    expect(items![0].price_snapshot).toBe(1000);
  });

  it("decrements stock in the same transaction that confirms the order", async () => {
    const id = await makeProduct(500, 4);
    await placeOrder([{ product_id: id, qty: 3 }], "Cash on Delivery");
    expect(await stockOf(id)).toBe(1);
  });

  it("refuses an order for more than the stock on hand", async () => {
    const id = await makeProduct(500, 2);
    const res = await placeOrder([{ product_id: id, qty: 3 }], "Cash on Delivery");
    expect(res.error).toMatch(/Only 2 left/i);
    expect(await stockOf(id)).toBe(2);
  });

  it("refuses a cart holding the same product on two lines above stock", async () => {
    const id = await makeProduct(500, 3);
    const res = await placeOrder(
      [
        { product_id: id, qty: 2 },
        { product_id: id, qty: 2 },
      ],
      "Cash on Delivery",
    );
    expect(res.error).toMatch(/Only 3 left/i);
    expect(await stockOf(id)).toBe(3);
  });

  it("merges duplicate lines of the same product into one when stock allows", async () => {
    const id = await makeProduct(500, 5);
    const { row } = await placeOrder(
      [
        { product_id: id, qty: 2 },
        { product_id: id, qty: 1 },
      ],
      "Cash on Delivery",
    );
    expect(row.total).toBe(1500);
    const { data: items } = await sb.from("order_items").select("qty").eq("order_id", row.order_id);
    expect(items).toHaveLength(1);
    expect(items![0].qty).toBe(3);
    expect(await stockOf(id)).toBe(2);
  });

  it("lets only one of two customers take the last item", async () => {
    const id = await makeProduct(500, 1);
    const [a, b] = await Promise.all([
      placeOrder([{ product_id: id, qty: 1 }], "Cash on Delivery"),
      placeOrder([{ product_id: id, qty: 1 }], "Cash on Delivery"),
    ]);
    const ok = [a, b].filter((r) => "row" in r && r.row);
    const failed = [a, b].filter((r) => "error" in r && r.error);
    expect(ok).toHaveLength(1);
    expect(failed).toHaveLength(1);
    expect(await stockOf(id)).toBe(0);
  });

  it("refuses a part that has no price yet", async () => {
    const id = await makeProduct(0, 5);
    const res = await placeOrder([{ product_id: id, qty: 1 }], "Cash on Delivery");
    expect(res.error).toMatch(/contact us for the price/i);
  });

  it("refuses a withdrawn product", async () => {
    const id = await makeProduct(500, 5);
    await sb.from("products").update({ status: "hidden" }).eq("id", id);
    const res = await placeOrder([{ product_id: id, qty: 1 }], "Cash on Delivery");
    expect(res.error).toMatch(/no longer available/i);
  });

  it("records GST as a component of an inclusive price", async () => {
    const id = await makeProduct(1180, 3);
    const { row } = await placeOrder([{ product_id: id, qty: 1 }], "Cash on Delivery");
    const { data: order } = await sb.from("orders").select("tax_amount, gst_rate, gst_included, total").eq("id", row.order_id).single();
    expect(order!.total).toBe(1180);
    expect(Number(order!.tax_amount)).toBeCloseTo(180, 0);
    expect(order!.gst_included).toBe(true);
  });

  it("marks a cash order cod_pending and an online order pending", async () => {
    const id = await makeProduct(500, 5);
    const cod = await placeOrder([{ product_id: id, qty: 1 }], "Cash on Delivery");
    const online = await placeOrder([{ product_id: id, qty: 1 }], "UPI");
    expect(cod.row.payment_status).toBe("cod_pending");
    expect(online.row.payment_status).toBe("pending");
  });

  it("blocks cash on delivery above the owner's limit", async () => {
    const id = await makeProduct(4500, 2);
    const res = await placeOrder([{ product_id: id, qty: 1 }], "Cash on Delivery");
    expect(res.error).toMatch(/cash on delivery/i);
    expect(await stockOf(id)).toBe(2);
  });

  it("allows the same order online when cash is blocked", async () => {
    const id = await makeProduct(4500, 2);
    const res = await placeOrder([{ product_id: id, qty: 1 }], "UPI");
    expect(res.row.payment_status).toBe("pending");
  });

  it("applies a valid coupon and ignores an invalid one", async () => {
    const { data: coupon } = await sb
      .from("coupons")
      .insert({ code: `${TAG}-10`.toUpperCase(), type: "percent", value: 10, min_order: 0, is_active: true })
      .select("id, code")
      .single();
    created.couponIds.push(coupon!.id);

    const id = await makeProduct(1000, 5);
    const good = await placeOrder([{ product_id: id, qty: 1 }], "Cash on Delivery", coupon!.code);
    expect(good.row.total).toBe(900);

    const bad = await placeOrder([{ product_id: id, qty: 1 }], "Cash on Delivery", "NOT-A-REAL-CODE");
    expect(bad.row.total).toBe(1000);
  });

  it("gives every order an unguessable public token and a readable id", async () => {
    const id = await makeProduct(500, 5);
    const { row } = await placeOrder([{ product_id: id, qty: 1 }], "Cash on Delivery");
    expect(row.human_id).toMatch(/^STE-\d{6}-\d{4}$/);
    expect(String(row.public_token).length).toBeGreaterThanOrEqual(20);
  });
});

describe("mark_order_paid", () => {
  it("marks the order paid once and ignores a retried webhook", async () => {
    const id = await makeProduct(1000, 5);
    const { row } = await placeOrder([{ product_id: id, qty: 1 }], "UPI");

    const first = await sb.rpc("mark_order_paid", { p_order_id: row.order_id, p_payment_id: "pay_TEST_1" });
    const second = await sb.rpc("mark_order_paid", { p_order_id: row.order_id, p_payment_id: "pay_TEST_1" });
    expect(first.data).toBe(true);
    expect(second.data).toBe(false);

    const { data: order } = await sb.from("orders").select("payment_status, provider_payment_id").eq("id", row.order_id).single();
    expect(order!.payment_status).toBe("paid");
    expect(order!.provider_payment_id).toBe("pay_TEST_1");
  });
});

describe("release_order", () => {
  it("puts the stock back when a payment is abandoned", async () => {
    const id = await makeProduct(1000, 5);
    const { row } = await placeOrder([{ product_id: id, qty: 2 }], "UPI");
    expect(await stockOf(id)).toBe(3);

    const released = await sb.rpc("release_order", { p_order_id: row.order_id, p_reason: "Payment not completed" });
    expect(released.data).toBe(true);
    expect(await stockOf(id)).toBe(5);

    const { data: order } = await sb.from("orders").select("status, stock_released").eq("id", row.order_id).single();
    expect(order!.stock_released).toBe(true);
    expect(order!.status).toBe("cancelled");
  });

  it("does not release the same order twice", async () => {
    const id = await makeProduct(1000, 5);
    const { row } = await placeOrder([{ product_id: id, qty: 1 }], "UPI");
    await sb.rpc("release_order", { p_order_id: row.order_id, p_reason: "first" });
    const again = await sb.rpc("release_order", { p_order_id: row.order_id, p_reason: "second" });
    expect(again.data).toBe(false);
    expect(await stockOf(id)).toBe(5);
  });

  it("does not release an order that is already paid", async () => {
    const id = await makeProduct(1000, 5);
    const { row } = await placeOrder([{ product_id: id, qty: 1 }], "UPI");
    await sb.rpc("mark_order_paid", { p_order_id: row.order_id, p_payment_id: "pay_TEST_2" });
    const released = await sb.rpc("release_order", { p_order_id: row.order_id, p_reason: "late" });
    expect(released.data).toBe(false);
    expect(await stockOf(id)).toBe(4);
  });
});
