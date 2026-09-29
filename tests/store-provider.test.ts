import { describe, expect, it } from "vitest";

describe("store provider stability", () => {
  it("preserves the store context identity across Vite hot updates", async () => {
    const source = await import("node:fs/promises").then((fs) => fs.readFile("src/hooks/useStore.tsx", "utf8"));
    expect(source).toContain("import.meta.hot?.data.storeContext");
    expect(source).toContain("import.meta.hot.data.storeContext = StoreContext");
  });

  it("keeps the storefront inside StoreProvider", async () => {
    const source = await import("node:fs/promises").then((fs) => fs.readFile("src/routes/__root.tsx", "utf8"));
    const start = source.indexOf("<StoreProvider>");
    const header = source.indexOf("<Header />");
    const outlet = source.indexOf("<Outlet />");
    const end = source.indexOf("</StoreProvider>");
    expect(start).toBeGreaterThan(-1);
    expect(header).toBeGreaterThan(start);
    expect(outlet).toBeGreaterThan(start);
    expect(end).toBeGreaterThan(outlet);
  });
});