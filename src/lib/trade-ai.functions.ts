import { createServerFn } from "@tanstack/react-start";
import type { TradeDocField } from "@/lib/trade.functions";
import type { DocCheck } from "@/lib/trade-ai.server";

const FIELDS = ["gst_certificate_path", "shop_photo_path", "address_proof_path", "pan_card_path", "trade_licence_path"];
const s = (v: unknown, n: number) => String(v ?? "").trim().slice(0, n);

/** Applicant: read one of their own uploaded papers with AI. */
export const checkTradeDocument = createServerFn({ method: "POST" })
  .inputValidator((d: { field: string; path: string; businessName?: string; gstin?: string; pan?: string }) => ({
    field: s(d?.field, 40), path: s(d?.path, 300), businessName: s(d?.businessName, 120), gstin: s(d?.gstin, 15), pan: s(d?.pan, 10),
  }))
  .handler(async ({ data }): Promise<DocCheck | null> => {
    if (!FIELDS.includes(data.field)) return null;
    const { tradeAccount } = await import("@/lib/trade.server");
    const acct = await tradeAccount();
    if (!acct.userId || !data.path.startsWith(`${acct.userId}/`)) return null;
    const { runDocCheck } = await import("@/lib/trade-ai.server");
    return runDocCheck(acct.userId, data.field as TradeDocField, data.path, data);
  });

/** Applicant: their saved checks. */
export const myDocChecks = createServerFn({ method: "POST" }).handler(async (): Promise<DocCheck[]> => {
  const { tradeAccount } = await import("@/lib/trade.server");
  const acct = await tradeAccount();
  if (!acct.userId) return [];
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin.from("trade_doc_checks" as never).select("*").eq("profile_id", acct.userId);
  return ((data ?? []) as Record<string, unknown>[]).map(toCheck);
});

export function toCheck(r: Record<string, unknown>): DocCheck {
  return {
    field: String(r["field"]),
    status: r["status"] as DocCheck["status"],
    extracted: (r["extracted"] ?? {}) as Record<string, string>,
    issues: (r["issues"] ?? []) as string[],
    checkedAt: String(r["checked_at"]),
  };
}

/** Staff: re-run the AI check on every paper of an application. */
export const recheckApplication = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string }) => ({ id: s(d?.id, 40) }))
  .handler(async ({ data }) => {
    const { requireStaff } = await import("@/lib/staff.server");
    await requireStaff();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: app } = await supabaseAdmin.from("trade_applications").select("*").eq("id", data.id).maybeSingle();
    if (!app) return { ok: false as const };
    const row = app as unknown as Record<string, string | null>;
    const { runDocCheck } = await import("@/lib/trade-ai.server");
    for (const f of FIELDS) {
      const path = row[f];
      if (path) await runDocCheck(String(row["profile_id"]), f as TradeDocField, path, { businessName: row["business_name"] ?? "", gstin: row["gstin"] ?? "", pan: row["pan"] ?? "" });
    }
    return { ok: true as const };
  });

/** Staff: add an internal note (never shown to the applicant). */
export const addTradeInternalNote = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string; body: string }) => ({ id: s(d?.id, 40), body: s(d?.body, 1000) }))
  .handler(async ({ data }) => {
    if (!data.body) return { ok: false as const };
    const { requireStaff } = await import("@/lib/staff.server");
    const actor = await requireStaff();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("trade_internal_notes" as never).insert(
      { application_id: data.id, author_id: actor.userId, author_name: actor.name || actor.email, body: data.body } as never,
    );
    return { ok: !error };
  });
