import { queryOptions } from "@tanstack/react-query";
import { isOrderingMode, type OrderingMode } from "@/lib/ordering";
import { getPublicShopSettings } from "@/lib/shop-settings.functions";

export type ShopSettings = {
  orderingMode: OrderingMode;
  browseBanner: string | null;
  showShowroomSection: boolean;
  gstEnabled: boolean;
  gstRate: number;
  pricesIncludeGst: boolean;
  gstin: string | null;
  legalName: string | null;
  billingAddress: string | null;
  codEnabled: boolean;
  codLimit: number;
  minOrderValue: number;
  codMinOrderValue: number;
  codPincodes: string[];
  supportEmail: string | null;
  grievanceName: string | null;
  grievanceEmail: string | null;
  grievancePhone: string | null;
  policyUpdatedAt: string | null;
};

export const DEFAULT_SETTINGS: ShopSettings = {
  orderingMode: "full",
  browseBanner: null,
  showShowroomSection: true,
  gstEnabled: true,
  gstRate: 18,
  pricesIncludeGst: true,
  gstin: null,
  legalName: null,
  billingAddress: null,
  codEnabled: true,
  codLimit: 2000,
  minOrderValue: 0,
  codMinOrderValue: 0,
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
    staleTime: 30_000,
    queryFn: async (): Promise<ShopSettings> => {
      const data = await getPublicShopSettings();
      if (!data) return DEFAULT_SETTINGS;
      return {
        orderingMode: isOrderingMode(data.ordering_mode) ? data.ordering_mode : "full",
        browseBanner: data.browse_banner,
        showShowroomSection: data.show_showroom_section !== false,
        gstEnabled: Boolean(data.gst_enabled),
        gstRate: Number(data.gst_rate ?? 0),
        pricesIncludeGst: Boolean(data.prices_include_gst),
        gstin: data.gstin,
        legalName: data.legal_name,
        billingAddress: data.billing_address,
        codEnabled: Boolean(data.cod_enabled),
        codLimit: Number(data.cod_limit ?? 0),
        minOrderValue: Number(data.min_order_value ?? 0),
        codMinOrderValue: Number(data.cod_min_order_value ?? 0),
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
  if (s.codMinOrderValue > 0 && total < s.codMinOrderValue)
    return { allowed: false, reason: `Cash on delivery needs a minimum order of ₹${s.codMinOrderValue.toLocaleString("en-IN")}.` };
  if (s.codLimit > 0 && total > s.codLimit)
    return { allowed: false, reason: `Cash on delivery is available up to ₹${s.codLimit.toLocaleString("en-IN")} only.` };
  if (s.codPincodes.length > 0 && pincode && !s.codPincodes.includes(pincode))
    return { allowed: false, reason: `Cash on delivery is not available for PIN code ${pincode}.` };
  return { allowed: true, reason: "" };
}

/** Goods-value floor after discounts, before shipping and any added tax. */
export function minimumOrderShortfall(goodsTotal: number, s: ShopSettings) {
  return s.minOrderValue > 0 ? Math.max(0, s.minOrderValue - goodsTotal) : 0;
}
