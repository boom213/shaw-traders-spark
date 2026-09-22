/** Trade account helpers. The tier always comes from the database, never the browser. */
import { getRequestHeader } from "@tanstack/react-start/server";

export type PriceTier = "retail" | "trade" | "distributor";

export type TradeAccount = {
  userId: string | null;
  email: string | null;
  customerType: "retail" | "trade";
  tier: PriceTier;
  approved: boolean;
  creditLimit: number;
  paymentTermsDays: number;
};

export const GUEST: TradeAccount = {
  userId: null,
  email: null,
  customerType: "retail",
  tier: "retail",
  approved: false,
  creditLimit: 0,
  paymentTermsDays: 0,
};

function bearer(): string | null {
  const header = getRequestHeader("authorization");
  const token = header?.replace(/^Bearer\s+/i, "").trim();
  return token && token.length > 10 ? token : null;
}

/** Resolve the signed-in customer and their approved price tier. */
export async function tradeAccount(): Promise<TradeAccount> {
  const token = bearer();
  if (!token) return GUEST;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: auth } = await supabaseAdmin.auth.getUser(token);
  const user = auth.user;
  if (!user) return GUEST;

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("customer_type, price_tier, trade_approved_at, credit_limit, payment_terms_days, email")
    .eq("id", user.id)
    .maybeSingle();

  const approved = profile?.customer_type === "trade" && !!profile?.trade_approved_at;
  return {
    userId: user.id,
    email: profile?.email ?? user.email ?? null,
    customerType: (profile?.customer_type as "retail" | "trade") ?? "retail",
    tier: approved ? ((profile?.price_tier as PriceTier) ?? "trade") : "retail",
    approved,
    creditLimit: Number(profile?.credit_limit ?? 0),
    paymentTermsDays: Number(profile?.payment_terms_days ?? 0),
  };
}

/** Price for one product at a tier and quantity, resolved in the database. */
export async function tierPrice(productId: string, tier: PriceTier, qty: number): Promise<number | null> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin.rpc("tier_price", {
    p_product: productId,
    p_tier: tier,
    p_qty: Math.max(1, Math.round(qty || 1)),
  });
  const value = Number(data);
  return Number.isFinite(value) && value > 0 ? value : null;
}

/** Short-lived signed link to a private identity document, for staff only. */
export async function signedDocUrl(path: string | null, seconds = 300): Promise<string | null> {
  if (!path) return null;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin.storage.from("trade-docs").createSignedUrl(path, seconds);
  return data?.signedUrl ?? null;
}

export async function tradeBalance(profileId: string): Promise<{ balance: number; overdue: boolean }> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const [{ data: balance }, { data: overdue }] = await Promise.all([
    supabaseAdmin.rpc("trade_balance", { _profile_id: profileId }),
    supabaseAdmin.rpc("trade_overdue", { _profile_id: profileId }),
  ]);
  return { balance: Number(balance ?? 0), overdue: Boolean(overdue) };
}
