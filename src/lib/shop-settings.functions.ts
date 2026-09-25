import { createServerFn } from "@tanstack/react-start";

/** Return only the storefront settings that customers need to render or place orders. */
export const getPublicShopSettings = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("shop_settings")
    .select("ordering_mode, browse_banner, gst_enabled, gst_rate, prices_include_gst, gstin, legal_name, billing_address, cod_enabled, cod_limit, cod_pincodes, support_email, grievance_officer_name, grievance_officer_email, grievance_officer_phone, policy_updated_at")
    .maybeSingle();

  if (error) throw new Error("Could not load shop settings");
  return data;
});