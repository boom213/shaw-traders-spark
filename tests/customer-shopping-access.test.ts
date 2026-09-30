import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { customerShoppingPath } from "@/lib/customer-shopping-access";

describe("customer shopping access", () => {
  it("allows only known same-site shopping destinations", () => {
    expect(customerShoppingPath("/shop?q=motor&page=2")).toBe("/shop?q=motor&page=2");
    expect(customerShoppingPath("/product/front-fork")).toBe("/product/front-fork");
    expect(customerShoppingPath("/scooters/model-one")).toBe("/scooters/model-one");
    expect(customerShoppingPath("/manage/orders")).toBeNull();
    expect(customerShoppingPath("//evil.example/shop")).toBeNull();
    expect(customerShoppingPath("https://evil.example/shop")).toBeNull();
  });

  it("guards every shopping route with the customer layout", () => {
    const routes = ["shop", "brand", "categories", "category.$slug", "product.$slug", "scooters.index", "scooters.$slug", "cart", "checkout", "offers"];
    for (const route of routes) {
      const source = readFileSync(`src/routes/_authenticated/_customer/${route}.tsx`, "utf8");
      expect(source).toContain('createFileRoute("/_authenticated/_customer/');
    }
    const guard = readFileSync("src/routes/_authenticated/_customer/route.tsx", "utf8");
    expect(guard).toContain('access.kind === "staff"');
    expect(guard).toContain("access.fallback");
  });

  it("shows Shopping only after a non-staff result", () => {
    const menu = readFileSync("src/components/site/AccountMenu.tsx", "utf8");
    expect(menu).toContain("staff && !staff.signedIn");
    expect(menu).toContain(">Shopping</DropdownMenuLabel>");
  });
});