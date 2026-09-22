import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type ShopSettings = {
  gstEnabled: boolean;
  gstRate: number;
  pricesIncludeGst: boolean;
  gstin: string | null;
  legalName: string | null;
  billingAddress: string | null;
  codEnabled: boolean;
  codLimit: number;
  codPincodes: string[];
  supportEmail: string | null;
  grievanceName: string | null;
  grievanceEmail: string | null;
  grievancePhone: string | null;
  policyUpdatedAt: string | null;
};

export const DEFAULT_SETTINGS: ShopSettings = {
  gstEnabled: true,
  gstRate: 18,
  pricesIncludeGst: true,
  gstin: null,
  legalName: null,
  billingAddress: null,
  codEnabled: true,
  codLimit: 2000,
  codPincodes: [],
  supportEmail: null,
  grievanceName: null,
  grievanceEmail: null,
  grievancePhone: null,
  policyUpdatedAt: null,
};

export const shopSettingsQuery = () =>
  queryOptions({
    queryKey: ["shop-settings"],
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<ShopSettings> => {
      const { data } = await supabase
        .from("shop_settings")
        .select("gst_enabled, gst_rate, prices_include_gst, gstin, legal_name, billing_address, cod_enabled, cod_limit, cod_pincodes, support_email, grievance_officer_name, grievance_officer_email, grievance_officer_phone, policy_updated_at")
        .maybeSingle();
      if (!data) return DEFAULT_SETTINGS;
      return {
        gstEnabled: Boolean(data.gst_enabled),
        gstRate: Number(data.gst_rate ?? 0),
        pricesIncludeGst: Boolean(data.prices_include_gst),
        gstin: data.gstin,
        legalName: data.legal_name,
        billingAddress: data.billing_address,
        codEnabled: Boolean(data.cod_enabled),
        codLimit: Number(data.cod_limit ?? 0),
        codPincodes: (data.cod_pincodes ?? []) as string[],
        supportEmail: data.support_email,
        grievanceName: data.grievance_officer_name,
        grievanceEmail: data.grievance_officer_email,
        grievancePhone: data.grievance_officer_phone,
        policyUpdatedAt: data.policy_updated_at,
      };
    },
  });

/** Grand total and the GST portion, matching what the database computes. */
export function withTax(base: number, s: ShopSettings) {
  if (!s.gstEnabled || s.gstRate <= 0) return { total: base, tax: 0 };
  if (s.pricesIncludeGst) {
    const tax = Math.round((base * s.gstRate) / (100 + s.gstRate) * 100) / 100;
    return { total: base, tax };
  }
  const tax = Math.round((base * s.gstRate) / 100 * 100) / 100;
  return { total: base + tax, tax };
}

/** Can this order be paid in cash on delivery? */
export function codAllowed(total: number, pincode: string, s: ShopSettings) {
  if (!s.codEnabled) return { allowed: false, reason: "Cash on delivery is currently switched off." };
  if (s.codLimit > 0 && total > s.codLimit)
    return { allowed: false, reason: `Cash on delivery is available up to ₹${s.codLimit.toLocaleString("en-IN")} only.` };
  if (s.codPincodes.length > 0 && pincode && !s.codPincodes.includes(pincode))
    return { allowed: false, reason: `Cash on delivery is not available for PIN code ${pincode}.` };
  return { allowed: true, reason: "" };
}
