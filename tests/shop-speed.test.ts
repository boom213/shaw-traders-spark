import { beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient } from "@tanstack/react-query";

vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => {
    const make = (validate: (d: unknown) => unknown) => (fn: (ctx: { data: unknown }) => unknown) => (args?: { data: unknown }) => fn({ data: validate(args?.data) });
    const builder = {
      middleware: () => builder,
      inputValidator: (validate: (d: unknown) => unknown) => ({ handler: make(validate) }),
      handler: make((d) => d),
    };
    return builder;
  },
}));

let facetReads = 0;
let facetDelay = 0;

vi.mock("@/lib/supabase-public.server", () => ({
  publicClient: () => ({
    from: (table: string) => {
      const q: Record<string, unknown> = {};
      for (const m of ["select", "eq", "order", "limit", "range", "in", "ilike", "gte", "lte", "gt"]) q[m] = () => q;
      q["then"] = (resolve: (v: unknown) => void) => {
        if (table === "product_compatibility") return resolve({ data: [], error: null });
        facetReads++;
        setTimeout(() => resolve({ data: [{ brand: "Ola", voltage: "60V", ah: "30" }], count: 1, error: null }), facetDelay);
      };
      return q;
    },
  }),
}));

describe("shop filter options", () => {
  beforeEach(() => { facetReads = 0; facetDelay = 0; });
  it("are read from the database once and then reused by the server", async () => {
    const { listFacets } = await import("@/lib/catalog.functions");
    const first = await listFacets();
    const second = await listFacets();
    expect(first).toEqual({ brands: ["Ola"], voltages: ["60V"], ahs: ["30"], models: [] });
    expect(second).toEqual(first);
    expect(facetReads).toBe(1);
  });
});

describe("shop page loader", () => {
  it("does not wait for the filter options before sending the page", async () => {
    vi.resetModules();
    vi.doMock("@/lib/queries", async (orig) => {
      const real = await orig<typeof import("@/lib/queries")>();
      return {
        ...real,
        facetsQuery: () => ({ queryKey: ["facets"], queryFn: () => new Promise(() => {}) }),
        productsQuery: () => ({ queryKey: ["products"], queryFn: async () => ({ items: [], total: 0 }) }),
      };
    });
    const { Route } = await import("@/routes/shop");
    type Loader = (ctx: unknown) => Promise<{ initial: unknown }>;
    const loader = Route.options.loader as unknown as Loader;
    const result = await Promise.race([
      loader({ context: { queryClient: new QueryClient() }, deps: { filters: { page: 0, pageSize: 24 } } }),
      new Promise((resolve) => setTimeout(() => resolve("still waiting"), 500)),
    ]);
    expect(result).toMatchObject({ initial: { items: [], total: 0 } });
  });
});
