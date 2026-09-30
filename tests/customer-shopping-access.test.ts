import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { customerShoppingPath } from "@/lib/customer-shopping-access";

describe("customer shopping access", () => {
  it("allows only known same-site shopping destinations", () => {
    expect(customerShoppingPath("/shop?q=motor&page=2")).toBe("/shop?q=motor&page=2");
    expect(customerShoppingPath("/product/front-fork")).toBe("/product/front-fork");
    expect(customerShoppingPath("/scooters/model-one")).toBe("/scooters/model-one");
    expect(customerShoppingPath("/trade")).toBe("/trade");
    expect(customerShoppingPath("/trade/pad?draft=1")).toBe("/trade/pad?draft=1");
    expect(customerShoppingPath("/manage/orders")).toBeNull();
    expect(customerShoppingPath("//evil.example/shop")).toBeNull();
    expect(customerShoppingPath("https://evil.example/shop")).toBeNull();
  });

  it("keeps every storefront route public without auth layouts", () => {
    const routes = ["shop", "brand", "categories", "category.$slug", "product.$slug", "scooters.index", "scooters.$slug", "cart", "checkout", "offers", "trade", "trade.pad"];
    for (const route of routes) {
      const source = readFileSync(`src/routes/${route}.tsx`, "utf8");
      expect(source).not.toContain("/_authenticated");
      expect(source).not.toContain("beforeLoad:");
    }
    expect(() => readFileSync("src/routes/_authenticated/route.tsx", "utf8")).toThrow();
    expect(() => readFileSync("src/routes/_authenticated/_customer/route.tsx", "utf8")).toThrow();
  });

  it("keeps guest, staff, and trade ordering blocked inside checkout", () => {
    const checkout = readFileSync("src/routes/checkout.tsx", "utf8");
    expect(checkout).toContain("if (!user) return <CheckoutSignIn />");
    expect(checkout).toContain("if (!purchase.eligible)");
    expect(checkout).toContain('purchase.reason === "trade" ? "/trade" : "/manage"');
    expect(checkout).toContain('title="Retail checkout only"');
  });

  it("shows Shopping only after a non-staff result", () => {
    const menu = readFileSync("src/components/site/AccountMenu.tsx", "utf8");
    expect(menu).toContain("staff && !staff.signedIn");
    expect(menu).toContain(">Shopping</DropdownMenuLabel>");
  });

  it("keeps Shop visible to staff while hiding their other customer-shopping shortcuts", () => {
    const header = readFileSync("src/components/site/Header.tsx", "utf8");
    expect(header).toContain('queryKey: ["account-staff-session", user?.id]');
    expect(header).toContain("const isStaff = Boolean(staff?.signedIn)");
    expect(header).toContain('{ to: "/shop", label: t("nav.shop") }');
    expect(header).toContain('{ to: "/shop", label: "Shop" }');
    expect(header).not.toContain('...(!isStaff ? [{ to: "/shop" as const');
    expect(header).toContain("!isStaff && (categories ?? []).length > 0");
    expect(header).toContain("user && wishlistReady && !isStaff");
    expect(header).toContain('siteMode === "full" && !isStaff');
    expect(header).toContain("!isStaff && navCategories.length > 0");
    for (const route of ["/trade", "/bulk", "/service", "/track", "/about", "/contact"]) {
      expect(header).toContain(`to: "${route}"`);
    }
  });

  it("shows Home, Shop, and Account tabs to staff", () => {
    const tabs = readFileSync("src/components/site/MobileTabBar.tsx", "utf8");
    expect(tabs).toContain('queryKey: ["account-staff-session", user?.id]');
    expect(tabs).toContain("const isStaff = Boolean(staff?.signedIn)");
    expect(tabs).toContain('{ to: "/shop" as const, key: "nav.shop" as TranslationKey');
    expect(tabs).not.toContain('...(!isStaff ? [{ to: "/shop" as const');
    expect(tabs).toContain('mode === "full" && !isStaff ? [cartItem]');
    expect(tabs).toContain('items.length === 4 ? "grid-cols-4" : items.length === 3 ? "grid-cols-3" : "grid-cols-2"');
  });

  it("hides customer account links from staff while keeping profile details", () => {
    const menu = readFileSync("src/components/site/AccountMenu.tsx", "utf8");
    const profileIndex = menu.indexOf('hash="details"');
    const customerLinksGate = menu.indexOf("{staff && !staff.signedIn && <>", profileIndex);
    expect(profileIndex).toBeGreaterThan(-1);
    expect(customerLinksGate).toBeGreaterThan(profileIndex);
    for (const label of ["My orders", "Wishlist", "Track an order"]) {
      expect(menu.indexOf(label)).toBeGreaterThan(customerLinksGate);
    }
  });

  it("hides customer account sections and skips their requests for staff", () => {
    const account = readFileSync("src/routes/account.tsx", "utf8");
    expect(account).toContain('queryKey: ["account-staff-session", user?.id]');
    expect(account).toContain("const isStaff = Boolean(staff?.signedIn)");
    expect(account).toContain("const customerAccountReady = Boolean(user) && staff !== undefined && !isStaff");
    expect(account).toContain("const showOrders = customerAccountReady && !isTrade");
    expect(account).toContain("enabled: showOrders");
    expect(account).toContain('{!isStaff && staff !== undefined && <section id="orders"');
    expect(account).toContain('{!isStaff && staff !== undefined && <section id="wishlist"');
    expect(account).toContain("!isStaff && staff !== undefined && saved.length > 0");
    expect(account).toContain('<section id="details"');
    expect(account).toContain("<AddressBook userId={user.id} />");
  });

  it("keeps tracking outside the customer shopping route guard", () => {
    const access = readFileSync("src/lib/customer-shopping-access.ts", "utf8");
    expect(access).not.toContain('"/track"');
    expect(customerShoppingPath("/track")).toBeNull();
  });

  it("hides customer trade links from staff and leaves staff trade administration separate", () => {
    const menu = readFileSync("src/components/site/AccountMenu.tsx", "utf8");
    const tradeLabel = menu.indexOf(">Trade & wholesale</DropdownMenuLabel>");
    const tradeGate = menu.lastIndexOf("{staff && !staff.signedIn && <>", tradeLabel);
    expect(tradeGate).toBeGreaterThan(-1);
    expect(tradeLabel).toBeGreaterThan(tradeGate);

    const staffTrade = readFileSync("src/routes/manage.trade.tsx", "utf8");
    expect(staffTrade).toContain('createFileRoute("/manage/trade")');
  });
});