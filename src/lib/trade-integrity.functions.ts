import { createServerFn } from "@tanstack/react-start";

export type TradeApprovalDrift = { applicationId: string; businessName: string };

export const tradeApprovalDrift = createServerFn({ method: "POST" })
  .inputValidator((data: undefined) => data)
  .handler(async (): Promise<TradeApprovalDrift[]> => {
    const { requireStaff } = await import("@/lib/staff.server");
    await requireStaff({ manager: true });
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin.from("trade_applications").select("id, business_name, requested_tier, profiles!inner(customer_type, price_tier, trade_approved_at, business_name)").eq("status", "approved");
    if (error) throw new Error(error.message);
    return (data ?? []).flatMap((application) => {
      const profile = application.profiles;
      const mismatched = profile.customer_type !== "trade" || !profile.trade_approved_at || profile.price_tier !== application.requested_tier || profile.business_name !== application.business_name;
      return mismatched ? [{ applicationId: String(application.id), businessName: String(application.business_name) }] : [];
    });
  });