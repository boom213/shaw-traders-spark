import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { isShopOwnBrand, productHeading } from "@/lib/seo";

// Compare code with all spacing removed, so reformatting can never fail these checks.
const squash = (text: string) => text.replace(/\s+/g, "");
const read = (path: string) => squash(readFileSync(path, "utf8"));

describe("own brand label", () => {
  it("treats the shop's own Shaw Traders brand as needing no label", () => {
    expect(isShopOwnBrand("Shaw Traders")).toBe(true);
    expect(isShopOwnBrand(" shaw traders ev ")).toBe(true);
    expect(isShopOwnBrand("Ola")).toBe(false);
    expect(isShopOwnBrand("Shaw Select")).toBe(false);
    expect(isShopOwnBrand(null)).toBe(false);
  });
  it("keeps product titles unchanged", () => {
    expect(productHeading("Shaw Traders", "12 No. Bolt")).toBe("12 No. Bolt");
    expect(productHeading("Ola", "S1 Charger")).toBe("Ola S1 Charger");
  });
  it("is used by product cards", () => {
    expect(read("src/components/site/ProductCard.tsx")).toContain(squash("!isShopOwnBrand(product.brand)"));
  });
});

describe("phone layout", () => {
  it("lets the category strip scroll away on phones while desktop keeps it pinned", () => {
    const header = read("src/components/site/Header.tsx");
    const closing = header.indexOf(squash("</header>"));
    expect(header.indexOf(squash('<div className="hidden lg:block">{categoryStrip}</div>'))).toBeLessThan(closing);
    expect(header.indexOf(squash("lg:hidden\">{categoryStrip}</div>"))).toBeGreaterThan(closing);
  });
  it("shows New Arrivals before the brand and showroom sections on the home page", () => {
    const home = read("src/routes/index.tsx");
    const newArrivals = home.indexOf(squash('title="New Arrivals"'));
    expect(newArrivals).toBeGreaterThan(0);
    expect(newArrivals).toBeLessThan(home.indexOf(squash("<BrandsSection />")));
    expect(newArrivals).toBeLessThan(home.indexOf(squash("<ScooterSection />")));
  });
  it("keeps the dash with the shop name in the home heading", () => {
    expect(read("src/routes/index.tsx")).toContain(squash('Shaw Traders EV{"\\u00a0"}—'));
  });
  it("does not clip the Sign In / Register label", () => {
    expect(read("src/components/site/AccountMenu.tsx")).toContain(squash('user ? "max-w-24 truncate" : "whitespace-nowrap"'));
  });
  it("adds a phone buy bar that only appears after the main buttons scroll away", () => {
    const page = read("src/routes/product.$slug.tsx");
    expect(page).toContain(squash("showStickyBuy && !buyButtonsVisible"));
    expect(page).toContain(squash("ref={buyButtonsRef}"));
    expect(read("src/hooks/useInView.ts")).toContain(squash("useCallback"));
  });
});

describe("labels for screen readers", () => {
  it("labels every shop filter", () => {
    const shop = read("src/routes/shop.tsx");
    for (const name of ["category", "brand", "min", "vehicle", "voltage", "capacity"]) {
      expect(shop).toContain(squash(`htmlFor={\`\${id}-${name}\`}`));
    }
    expect(shop).toContain(squash("useId()"));
  });
  it("labels the product page PIN code and review fields", () => {
    const page = read("src/routes/product.$slug.tsx");
    for (const label of ["Delivery PIN code", "Your rating", "Review headline (optional)", "Your review"]) {
      expect(page).toContain(squash(`aria-label="${label}"`));
    }
    expect(page).toContain(squash('htmlFor="review-photos"'));
  });
});
