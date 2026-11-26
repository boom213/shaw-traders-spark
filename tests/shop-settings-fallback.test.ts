import { beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryObserver } from "@tanstack/react-query";

// What a component mounting now would see: stale data is fetched again.
const staleOnMount = (qc: QueryClient, options: object) =>
  new QueryObserver(qc, options as never).getCurrentResult().isStale;

const read = vi.fn();
vi.mock("@/lib/shop-settings.functions", () => ({ getPublicShopSettings: () => read() }));

const row = {
  ordering_mode: "full", browse_banner: null, show_showroom_section: true, gst_enabled: true, gst_rate: 5,
  prices_include_gst: false, gstin: null, legal_name: "Shaw Traders", billing_address: null, cod_enabled: false,
  cod_limit: 0, min_order_value: 0, cod_min_order_value: 0, cod_pincodes: [], support_email: null,
  grievance_officer_name: null, grievance_officer_email: null, grievance_officer_phone: null, policy_updated_at: null,
};

// Same retry setting as src/router.tsx, so a throw would surface as an error.
const client = () => new QueryClient({ defaultOptions: { queries: { retry: 1, retryDelay: 0 } } });

describe("shop settings never take the site down", () => {
  beforeEach(() => {
    read.mockReset();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("shows the defaults when the database cannot be read, and fetches again on the next mount", async () => {
    read.mockRejectedValue(new Error("Could not load shop settings"));
    const { shopSettingsQuery, DEFAULT_SETTINGS } = await import("@/lib/shop-settings");
    const qc = client();
    const settings = await qc.ensureQueryData(shopSettingsQuery());
    expect(settings).toEqual({ ...DEFAULT_SETTINGS, loadFailed: true });
    expect(read).toHaveBeenCalledTimes(1); // no slow retries holding the page
    expect(staleOnMount(qc, shopSettingsQuery())).toBe(true);
  });

  it("keeps the real settings fresh for 30 seconds once the read works", async () => {
    read.mockResolvedValue(row);
    const { shopSettingsQuery } = await import("@/lib/shop-settings");
    const qc = client();
    const settings = await qc.ensureQueryData(shopSettingsQuery());
    expect(settings).toMatchObject({ gstRate: 5, codEnabled: false, legalName: "Shaw Traders" });
    expect(settings.loadFailed).toBeUndefined();
    expect(staleOnMount(qc, shopSettingsQuery())).toBe(false);
  });

  it("replaces the defaults with the real settings when the database is back", async () => {
    read.mockRejectedValueOnce(new Error("down")).mockResolvedValueOnce(row);
    const { shopSettingsQuery } = await import("@/lib/shop-settings");
    const qc = client();
    await qc.ensureQueryData(shopSettingsQuery());
    const settings = await qc.fetchQuery(shopSettingsQuery());
    expect(settings).toMatchObject({ gstRate: 5, codEnabled: false });
    expect(settings.loadFailed).toBeUndefined();
  });
});
