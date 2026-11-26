import { describe, expect, it, vi } from "vitest";
import { QueryClient, QueryObserver } from "@tanstack/react-query";

// What a component mounting now would see: stale data is fetched again.
const staleOnMount = (qc: QueryClient, options: object) =>
  new QueryObserver(qc, options as never).getCurrentResult().isStale;

const list = vi.fn();
vi.mock("@/lib/catalog.functions", () => ({ listCategories: () => list() }));

describe("header categories", () => {
  it("try again soon when the list came back empty (database unreachable)", async () => {
    list.mockResolvedValue([]);
    const { categoriesQuery } = await import("@/lib/queries");
    const qc = new QueryClient();
    await qc.ensureQueryData(categoriesQuery());
    expect(staleOnMount(qc, categoriesQuery())).toBe(true);
  });

  it("stay cached for five minutes when they loaded", async () => {
    list.mockResolvedValue([{ slug: "chargers", name: "Chargers", blurb: "", icon: null, productCount: 3 }]);
    const { categoriesQuery } = await import("@/lib/queries");
    const qc = new QueryClient();
    await qc.ensureQueryData(categoriesQuery());
    expect(staleOnMount(qc, categoriesQuery())).toBe(false);
  });
});
