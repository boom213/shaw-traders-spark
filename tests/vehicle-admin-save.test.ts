import { beforeEach, describe, expect, it, vi } from "vitest";

// Run the server function's handler directly with a fake database so a failed write can be simulated.
vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => {
    const handler =
      (validate: (d: unknown) => unknown) => (fn: (ctx: { data: unknown }) => unknown) => (args?: { data: unknown }) =>
        fn({ data: validate(args?.data) });
    const builder = {
      middleware: () => builder,
      inputValidator: (validate: (d: unknown) => unknown) => ({ handler: handler(validate) }),
      handler: handler((d) => d),
    };
    return builder;
  },
}));

type Outcome = { error: { message: string } | null; data?: unknown };
const outcomes: Record<string, Outcome> = {};
const audit = vi.fn();

function chain(result: Outcome) {
  const c: Record<string, unknown> = {};
  for (const m of ["update", "eq", "select", "insert", "single", "delete"]) c[m] = () => c;
  c.then = (resolve: (v: Outcome) => void) => resolve(result);
  return c;
}

vi.mock("@/lib/staff.server", () => ({
  requireStaff: async () => ({ userId: "staff-1" }),
  logAudit: (...args: unknown[]) => audit(...args),
}));
vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: {
    from: (table: string) => ({
      update: () => chain(outcomes[`${table}.update`] ?? { error: null, data: [{ id: "x" }] }),
      upsert: () => chain(outcomes[`${table}.upsert`] ?? { error: null }),
      insert: () => chain(outcomes[`${table}.insert`] ?? { error: null, data: { id: "new-1" } }),
    }),
  },
}));

const ID = "11111111-1111-4111-8111-111111111111";
const input = { id: ID, name: "Test Scooter", status: "visible", specs: {}, price: {} };

describe("saving a scooter model", () => {
  beforeEach(() => {
    for (const k of Object.keys(outcomes)) delete outcomes[k];
    audit.mockClear();
  });

  it("reports failure when the model update fails", async () => {
    outcomes["products.update"] = { error: { message: "permission denied" } };
    const { saveVehicle } = await import("@/lib/vehicles-admin.functions");
    const r = await (saveVehicle as unknown as (a: { data: unknown }) => Promise<{ ok: boolean; error?: string }>)({ data: input });
    expect(r.ok).toBe(false);
    expect(r.error).toContain("permission denied");
    expect(audit).not.toHaveBeenCalled();
  });

  it("reports failure when no model matched the update", async () => {
    outcomes["products.update"] = { error: null, data: [] };
    const { saveVehicle } = await import("@/lib/vehicles-admin.functions");
    const r = await (saveVehicle as unknown as (a: { data: unknown }) => Promise<{ ok: boolean }>)({ data: input });
    expect(r.ok).toBe(false);
  });

  it("reports failure when the price fails to save", async () => {
    outcomes["vehicle_pricing.upsert"] = { error: { message: "bad price" } };
    const { saveVehicle } = await import("@/lib/vehicles-admin.functions");
    const r = await (saveVehicle as unknown as (a: { data: unknown }) => Promise<{ ok: boolean; error?: string }>)({ data: input });
    expect(r.ok).toBe(false);
    expect(r.error).toContain("price did not save");
  });

  it("reports success only when every write succeeds", async () => {
    const { saveVehicle } = await import("@/lib/vehicles-admin.functions");
    const r = await (saveVehicle as unknown as (a: { data: unknown }) => Promise<{ ok: boolean }>)({ data: input });
    expect(r.ok).toBe(true);
    expect(audit).toHaveBeenCalledTimes(1);
  });
});
