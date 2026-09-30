import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { counterSaleQuantity, counterSaleShortage } from "@/lib/counter-sale-stock";

describe("Counter Sales stock override", () => {
  it("keeps positive whole quantities without a stock cap", () => {
    expect(counterSaleQuantity(8.9)).toBe(8);
    expect(counterSaleQuantity(0)).toBe(1);
    expect(counterSaleQuantity(Number.NaN)).toBe(1);
  });

  it("reports only the amount above available stock", () => {
    expect(counterSaleShortage(4, 6)).toBe(0);
    expect(counterSaleShortage(6, 6)).toBe(0);
    expect(counterSaleShortage(9, 6)).toBe(3);
  });

  it("floors stock at zero and restores only the actual deduction", () => {
    const migration = readFileSync("drizzle/migrations/0065_allow_counter_sales_above_stock.sql", "utf8");
    expect(migration).toContain("stock=GREATEST(stock-v_qty,0)");
    expect(migration).toContain("v_stock_deducted := LEAST(GREATEST(v_product.stock, 0), v_qty)");
    expect(migration).toContain("COALESCE(v_item.stock_deducted, v_item.qty)");
    expect(migration).not.toContain("IF v_product.stock < v_qty THEN RAISE EXCEPTION");
  });

  it("keeps the retail order stock rejection", () => {
    const migration = readFileSync("drizzle/migrations/0064_retail_minimum_order_safeguards.sql", "utf8");
    expect(migration).toMatch(/IF v_product\.stock < v_qty THEN[\s\S]*Only % left/i);
  });
});