import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { mapCounterProduct } from "@/lib/counter-sales.functions";

describe("accepted quote to Counter Sales", () => {
  it("uses the customer tier baseline while preserving current product details", () => {
    const product = mapCounterProduct({
      id: "part-1", sku: "SKU-1", name: "Brake shoe", price: 900, stock: 4, rack_location: "A-2",
      product_images: [{ url: "https://example.com/part.jpg", sort_order: 0 }],
      price_tiers: [{ tier: "trade", price: 700, min_qty: 1 }, { tier: "distributor", price: 600, min_qty: 1 }],
    }, "trade");
    expect(product.wholesalePrice).toBe(700);
    expect(product.retailPrice).toBe(900);
    expect(product.rackLocation).toBe("A-2");
  });

  it("keeps the server boundary and accepted-only safeguards", () => {
    const source = readFileSync("src/lib/quote-requests.functions.ts", "utf8");
    expect(source).toContain('requireStaff({ capability: "counter-sales" })');
    expect(source).toContain('quote.status !== "accepted"');
    expect(source).toContain("skipped.push({ name, reason:");
    expect(source).toContain("qty: Number(item.qty), unitPrice: Number(item.unit_price)");
  });

  it("keeps the route parameter optional and clears it after use", () => {
    const source = readFileSync("src/routes/manage.counter-sales.tsx", "utf8");
    expect(source).toContain("quote?: string");
    expect(source).toContain("UUID_PATTERN.test(search.quote)");
    expect(source).toContain('navigate({ search: {}, replace: true })');
    expect(source).toContain("Replace the current counter sale draft?");
  });

  it("shows the copy action only for accepted quotes", () => {
    const source = readFileSync("src/routes/manage.quotes.tsx", "utf8");
    expect(source).toContain('quote.status === "accepted"');
    expect(source).toContain("Copy to counter sale");
    expect(source).toContain('to="/manage/counter-sales"');
  });
});