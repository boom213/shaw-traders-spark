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

  it("hides header shopping entry points from staff without hiding service links", () => {
    const header = readFileSync("src/components/site/Header.tsx", "utf8");
    expect(header).toContain('queryKey: ["account-staff-session", user?.id]');
    expect(header).toContain("const isStaff = Boolean(staff?.signedIn)");
    expect(header).toContain('...(!isStaff ? [{ to: "/shop" as const');
    expect(header).toContain("!isStaff && (categories ?? []).length > 0");
    expect(header).toContain("user && wishlistReady && !isStaff");
    expect(header).toContain('siteMode === "full" && !isStaff');
    expect(header).toContain("!isStaff && navCategories.length > 0");
    for (const route of ["/trade", "/bulk", "/service", "/track", "/about", "/contact"]) {
      expect(header).toContain(`to: "${route}"`);
    }
  });

  it("shows only Home and Account tabs to staff", () => {
    const tabs = readFileSync("src/components/site/MobileTabBar.tsx", "utf8");
    expect(tabs).toContain('queryKey: ["account-staff-session", user?.id]');
    expect(tabs).toContain("const isStaff = Boolean(staff?.signedIn)");
    expect(tabs).toContain('...(!isStaff ? [{ to: "/shop" as const');
    expect(tabs).toContain('mode === "full" && !isStaff ? [cartItem]');
    expect(tabs).toContain('items.length === 4 ? "grid-cols-4" : items.length === 3 ? "grid-cols-3" : "grid-cols-2"');
  });
});