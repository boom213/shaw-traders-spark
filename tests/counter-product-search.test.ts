import { beforeEach, describe, expect, it, vi } from "vitest";

// Run the server function's handler directly with a fake database.
vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => {
    const handler =
      (validate: (d: unknown) => unknown) =>
      (fn: (ctx: { data: unknown }) => unknown) =>
      (args?: { data: unknown }) =>
        fn({ data: validate(args?.data) });
    const builder = {
      middleware: () => builder,
      inputValidator: (validate: (d: unknown) => unknown) => ({ handler: handler(validate) }),
      handler: handler((d) => d),
    };
    return builder;
  },
}));

type Product = {
  id: string;
  name: string;
  sku: string;
  stock: number;
  price: number;
  rack_location: string | null;
  category: string;
};

const shocks: Product = {
  id: "p-shock",
  name: "27mm Front Shock Absorber Set",
  sku: "SHOCK-27",
  stock: 4,
  price: 4000,
  rack_location: "B2",
  category: "Suspension",
};
const fork: Product = {
  id: "p-fork",
  name: "Rear Fork Spring",
  sku: "FORK-1",
  stock: 0,
  price: 900,
  rack_location: null,
  category: "Suspension",
};
const bolt: Product = {
  id: "p-bolt",
  name: "12 No. Bolt",
  sku: "BOLT-12",
  stock: 50,
  price: 199,
  rack_location: "A1",
  category: "Body Parts",
};
let catalogue: Product[] = [];
let rpcCalls: { p_term: string }[] = [];

const row = (p: Product) => ({ ...p, product_images: [], price_tiers: [] });

/** A tiny stand-in for the Supabase query builder covering the calls the search makes. */
function productsQuery() {
  let rows = catalogue;
  const q: Record<string, unknown> = {};
  q.select = () => q;
  q.eq = () => q;
  q.gt = (col: string, v: number) => (
    (rows = rows.filter((p) => ((p as Record<string, unknown>)[col] as number) > v)),
    q
  );
  q.in = (_col: string, ids: string[]) => ((rows = rows.filter((p) => ids.includes(p.id))), q);
  q.or = (filter: string) => {
    const term = /ilike\."?%([^%]*)%/.exec(filter)?.[1]?.toLowerCase() ?? "";
    rows = rows.filter((p) =>
      [p.name, p.sku, p.rack_location ?? ""].some((v) => v.toLowerCase().includes(term)),
    );
    return q;
  };
  q.order = () => q;
  q.limit = () => q;
  q.then = (resolve: (v: unknown) => void) => resolve({ data: rows.map(row), error: null });
  return q;
}

vi.mock("@/lib/staff.server", () => ({
  requireStaff: async () => ({ userId: "staff-1" }),
  logAudit: vi.fn(),
}));
vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: {
    from: (table: string) => {
      if (table === "profiles") {
        const p: Record<string, unknown> = {};
        p.select = () => p;
        p.eq = () => p;
        p.maybeSingle = async () => ({
          data: { price_tier: "trade", customer_type: "trade", trade_approved_at: "2026-01-01" },
          error: null,
        });
        return p;
      }
      return productsQuery();
    },
    rpc: async (_name: string, args: { p_term: string }) => {
      rpcCalls.push(args);
      const term = args.p_term;
      const hits = catalogue
        .filter(
          (p) => p.category.toLowerCase().includes(term) || p.name.toLowerCase().includes(term),
        )
        .map((p) => ({ id: p.id, score: 0.7 }));
      return { data: [...hits, { id: bolt.id, score: 0.1 }], error: null };
    },
  },
}));

type Search = (a: {
  data: { q: string; customerId: string };
}) => Promise<{ id: string; stock: number }[]>;

describe("billing product search", () => {
  beforeEach(() => {
    catalogue = [shocks, fork, bolt];
    rpcCalls = [];
  });

  it("finds parts by category even when the name does not contain the word", async () => {
    const { searchCounterProducts } = await import("@/lib/counter-sales.functions");
    const results = await (searchCounterProducts as unknown as Search)({
      data: { q: "suspensio", customerId: "c1" },
    });
    expect(results.map((r) => r.id)).toEqual(["p-shock", "p-fork"]);
    expect(rpcCalls[0]?.p_term).toBe("suspensio");
  });

  it("lists out-of-stock items after in-stock ones (counter sales may exceed stock)", async () => {
    const { searchCounterProducts } = await import("@/lib/counter-sales.functions");
    const results = await (searchCounterProducts as unknown as Search)({
      data: { q: "suspensio", customerId: "c1" },
    });
    expect(results.at(-1)).toMatchObject({ id: "p-fork", stock: 0 });
  });

  it("still finds products by shelf location", async () => {
    const { searchCounterProducts } = await import("@/lib/counter-sales.functions");
    const results = await (searchCounterProducts as unknown as Search)({
      data: { q: "A1", customerId: "c1" },
    });
    expect(results.map((r) => r.id)).toContain("p-bolt");
  });

  it("drops weak fuzzy matches", async () => {
    const { searchCounterProducts } = await import("@/lib/counter-sales.functions");
    const results = await (searchCounterProducts as unknown as Search)({
      data: { q: "suspensio", customerId: "c1" },
    });
    expect(results.map((r) => r.id)).not.toContain("p-bolt");
  });

  it("keeps the in-stock opening list when nothing is typed", async () => {
    const { searchCounterProducts } = await import("@/lib/counter-sales.functions");
    const results = await (searchCounterProducts as unknown as Search)({
      data: { q: "", customerId: "c1" },
    });
    expect(results.map((r) => r.id).sort()).toEqual(["p-bolt", "p-shock"]);
    expect(rpcCalls).toHaveLength(0);
  });
});
