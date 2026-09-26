import { createServerFn } from "@tanstack/react-start";

export type TradeApplicationRow = {
  id: string;
  profileId: string;
  businessName: string;
  gstin: string | null;
  pan: string | null;
  shopAddress: string;
  contactPerson: string;
  phone: string;
  alternatePhone: string | null;
  status: string;
  decisionNote: string | null;
  reviewer: string | null;
  createdAt: string;
  documents: { label: string; url: string | null }[];
  businessType: string | null;
  yearsInBusiness: string | null;
  staffCount: string | null;
  monthlyVolume: string | null;
  brands: string[];
  partCategories: string[];
  tier: string;
  creditLimit: number;
  paymentTermsDays: number;
  balance: number;
  overdue: boolean;
  checks: import("@/lib/trade-ai.server").DocCheck[];
  notes: { id: string; author: string; body: string; createdAt: string }[];
};

const text = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);
const TIERS = ["retail", "trade", "distributor"] as const;

/** The trade application queue, with short-lived links to the documents. */
export const listTradeApplications = createServerFn({ method: "POST" })
  .inputValidator((data: { status?: string } | undefined) => ({ status: String(data?.status ?? "pending") }))
  .handler(async ({ data }): Promise<TradeApplicationRow[]> => {
    const { requireStaff } = await import("@/lib/staff.server");
    await requireStaff({ capability: "trade" });
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { signedDocUrl, tradeBalance } = await import("@/lib/trade.server");
    const { DOC_FIELDS } = await import("@/lib/trade.functions");

    let query = supabaseAdmin
      .from("trade_applications")
      .select("*, profiles(price_tier, credit_limit, payment_terms_days)")
      .order("created_at", { ascending: false })
      .limit(100);
    if (data.status !== "all") query = query.eq("status", data.status as never);
    const { data: rows } = await query;
    const ids = (rows ?? []).map((r) => String(r.id));
    const pids = (rows ?? []).map((r) => String(r.profile_id));
    const { toCheck } = await import("@/lib/trade-ai.functions");
    const { data: checkRows } = pids.length ? await supabaseAdmin.from("trade_doc_checks" as never).select("*").in("profile_id", pids) : { data: [] };
    const { data: noteRows } = ids.length ? await supabaseAdmin.from("trade_internal_notes" as never).select("*").in("application_id", ids).order("created_at") : { data: [] };

    return Promise.all(
      (rows ?? []).map(async (r) => {
        const profile = (r as { profiles?: { price_tier?: string; credit_limit?: number; payment_terms_days?: number } | null }).profiles;
        const credit = await tradeBalance(String(r.profile_id));
        const documents = await Promise.all(
          DOC_FIELDS.map(async (d) => ({
            label: d.label,
            url: await signedDocUrl((r as unknown as Record<string, string | null>)[d.field] ?? null),
          })),
        );
        return {
          id: String(r.id),
          profileId: String(r.profile_id),
          businessName: String(r.business_name),
          gstin: r.gstin,
          pan: r.pan,
          shopAddress: String(r.shop_address),
          contactPerson: String(r.contact_person),
          phone: String(r.phone),
          alternatePhone: r.alternate_phone,
          status: String(r.status),
          decisionNote: r.decision_note,
          reviewer: r.reviewer,
          createdAt: String(r.created_at),
          documents,
          businessType: r.business_type,
          yearsInBusiness: r.years_in_business,
          staffCount: r.staff_count,
          monthlyVolume: r.monthly_volume,
          brands: r.brands ?? [],
          partCategories: r.part_categories ?? [],
          tier: String(profile?.price_tier ?? "retail"),
          creditLimit: Number(profile?.credit_limit ?? 0),
          paymentTermsDays: Number(profile?.payment_terms_days ?? 0),
          balance: credit.balance,
          overdue: credit.overdue,
          checks: ((checkRows ?? []) as Record<string, unknown>[])
            .filter((c) => c["profile_id"] === r.profile_id && (r as unknown as Record<string, unknown>)[String(c["field"])] === c["path"])
            .map(toCheck),
          notes: ((noteRows ?? []) as Record<string, unknown>[])
            .filter((n) => n["application_id"] === r.id)
            .map((n) => ({ id: String(n["id"]), author: String(n["author_name"] ?? ""), body: String(n["body"]), createdAt: String(n["created_at"]) })),
        };
      }),
    );
  });

/** Approve, reject or ask for one more document. */
export const decideTradeApplication = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string; decision: "approved" | "rejected" | "more_info_needed"; note?: string; tier?: string }) => ({
    id: text(data?.id, 40),
    decision: (["approved", "rejected", "more_info_needed"] as const).includes(data?.decision as never)
      ? (data.decision as "approved" | "rejected" | "more_info_needed")
      : "more_info_needed",
    note: text(data?.note, 400),
    tier: TIERS.includes(String(data?.tier) as never) ? String(data?.tier) : "trade",
  }))
  .handler(async ({ data }) => {
    const { requireStaff } = await import("@/lib/staff.server");
    const actor = await requireStaff({ capability: "trade" });
    return runTradeDecision(actor, data);
  });

type DecisionInput = { id: string; decision: "approved" | "rejected" | "more_info_needed"; note: string; tier: string };

/** Shared approval logic, used by the queue and by manual account creation. */
async function runTradeDecision(actor: import("@/lib/staff.server").StaffContext, data: DecisionInput) {
    const { logAudit } = await import("@/lib/staff.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: app, error: appError } = await supabaseAdmin
      .from("trade_applications")
      .select("id, profile_id, business_name, status")
      .eq("id", data.id)
      .maybeSingle();
    if (appError) return { ok: false as const, error: appError.message };
    if (!app) return { ok: false as const, error: "Application not found." };
    if ((app.status === "approved" || app.status === "rejected") && app.status === data.decision) {
      return { ok: true as const, alreadyDecided: true as const };
    }
    if (data.decision !== "approved" && data.note.length < 4) {
      return { ok: false as const, error: "Please say what is missing or why." };
    }

    await supabaseAdmin
      .from("trade_applications")
      .update({
        status: data.decision,
        decision_note: data.note || null,
        reviewer: actor.name,
        decided_at: new Date().toISOString(),
      } as never)
      .eq("id", data.id);

    if (data.decision === "approved") {
      await supabaseAdmin
        .from("profiles")
        .update({ customer_type: "trade", price_tier: data.tier, trade_approved_at: new Date().toISOString() } as never)
        .eq("id", app.profile_id);
    } else {
      await supabaseAdmin.from("profiles").update({ trade_approved_at: null } as never).eq("id", app.profile_id);
    }

    await logAudit(supabaseAdmin as never, actor, `trade.application.${data.decision}`, "trade_applications", data.id, {
      business: app.business_name,
      tier: data.tier,
      note: data.note,
    });

    const { notifyTradeDecision } = await import("@/lib/trade-notify.server");
    await notifyTradeDecision(String(app.profile_id), data.decision, data.note);
    return { ok: true as const };
}

/** Staff open a trade account for a dealer who came in by phone or WhatsApp. */
export const createTradeAccountManually = createServerFn({ method: "POST" })
  .inputValidator((data: {
    businessName: string; contactPerson?: string; phone: string; gstin?: string; pan?: string; shopAddress: string;
    docsVerifiedInPerson?: boolean; submitAs?: "pending" | "approved"; tier?: string;
  }) => ({
    businessName: text(data?.businessName, 120),
    contactPerson: text(data?.contactPerson, 80),
    phone: String(data?.phone ?? "").replace(/\D/g, "").slice(-10),
    gstin: text(data?.gstin, 20).toUpperCase(),
    pan: text(data?.pan, 12).toUpperCase(),
    shopAddress: text(data?.shopAddress, 400),
    docsVerifiedInPerson: data?.docsVerifiedInPerson === true,
    submitAs: data?.submitAs === "approved" ? ("approved" as const) : ("pending" as const),
    tier: TIERS.includes(String(data?.tier) as never) ? String(data?.tier) : "trade",
  }))
  .handler(async ({ data }) => {
    const { requireStaff, logAudit } = await import("@/lib/staff.server");
    const actor = await requireStaff({ capability: "trade" });
    const { taxIdError } = await import("@/lib/trade-options");
    if (data.businessName.length < 3) return { ok: false as const, error: "Please give the business name." };
    if (data.phone.length !== 10) return { ok: false as const, error: "Enter a 10-digit mobile number." };
    if (data.shopAddress.length < 8) return { ok: false as const, error: "Please give the shop address." };
    const taxErr = taxIdError(data.gstin, data.pan);
    if (taxErr) return { ok: false as const, error: taxErr };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const e164 = `+91${data.phone}`;

    // Find an existing sign-in for this number, or create a pre-verified one.
    let userId: string | null = null;
    const { data: prof } = await supabaseAdmin.from("profiles").select("id").in("phone", [e164, data.phone, `91${data.phone}`]).limit(1).maybeSingle();
    if (prof) userId = String(prof.id);
    if (!userId) {
      const { data: created, error } = await supabaseAdmin.auth.admin.createUser({ phone: e164, phone_confirm: true });
      if (created?.user) userId = created.user.id;
      else {
        for (let page = 1; page <= 20 && !userId; page++) {
          const { data: list } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 200 });
          const hit = list?.users.find((u) => String(u.phone ?? "").replace(/\D/g, "").endsWith(data.phone));
          if (hit) userId = hit.id;
          if (!list || list.users.length < 200) break;
        }
        if (!userId) return { ok: false as const, error: error?.message ?? "Could not create the account." };
      }
    }

    await supabaseAdmin.from("profiles").upsert(
      { id: userId, phone: e164, full_name: data.contactPerson || null, customer_type: "trade" } as never,
      { onConflict: "id" },
    );

    const { data: existing } = await supabaseAdmin.from("trade_applications").select("id, status").eq("profile_id", userId).order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (existing?.status === "approved") return { ok: false as const, error: "This number already has an approved trade account." };

    const note = data.docsVerifiedInPerson ? `Documents verified in person by ${actor.name}` : `Created by ${actor.name}`;
    const row = {
      profile_id: userId,
      business_name: data.businessName,
      contact_person: data.contactPerson || data.businessName,
      phone: data.phone,
      gstin: data.gstin || null,
      pan: data.pan || null,
      shop_address: data.shopAddress,
      status: "pending" as const,
      decision_note: note,
    };
    let appId: string;
    if (existing) {
      await supabaseAdmin.from("trade_applications").update(row as never).eq("id", existing.id);
      appId = String(existing.id);
    } else {
      const { data: ins, error } = await supabaseAdmin.from("trade_applications").insert(row as never).select("id").single();
      if (error || !ins) return { ok: false as const, error: "Could not save the application." };
      appId = String(ins.id);
    }

    await logAudit(supabaseAdmin as never, actor, "trade.application.manual_create", "trade_applications", appId, {
      business: data.businessName, docsVerifiedInPerson: data.docsVerifiedInPerson, submitAs: data.submitAs,
    });

    if (data.submitAs === "approved") {
      const res = await runTradeDecision(actor, { id: appId, decision: "approved", note, tier: data.tier });
      if (!res.ok) return res;
    }
    return { ok: true as const, status: data.submitAs };
  });

/** Credit limit, payment terms and tier for one trade account. */
export const setTradeTerms = createServerFn({ method: "POST" })
  .inputValidator((data: { profileId: string; tier?: string; creditLimit?: number; paymentTermsDays?: number }) => ({
    profileId: text(data?.profileId, 40),
    tier: TIERS.includes(String(data?.tier) as never) ? String(data?.tier) : null,
    creditLimit: Math.max(0, Math.min(10_000_000, Number(data?.creditLimit) || 0)),
    paymentTermsDays: Math.max(0, Math.min(180, Math.round(Number(data?.paymentTermsDays) || 0))),
  }))
  .handler(async ({ data }) => {
    const { requireStaff, logAudit } = await import("@/lib/staff.server");
    const actor = await requireStaff({ superAdmin: true });
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: latestApplication, error: applicationError } = await supabaseAdmin
      .from("trade_applications")
      .select("status")
      .eq("profile_id", data.profileId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (applicationError) return { ok: false as const, error: applicationError.message };
    if (latestApplication?.status !== "approved") {
      return { ok: false as const, error: "This account has no approved trade application" };
    }
    const patch: Record<string, unknown> = {
      credit_limit: data.creditLimit,
      payment_terms_days: data.paymentTermsDays,
    };
    if (data.tier) patch['price_tier'] = data.tier;
    const { error } = await supabaseAdmin.from("profiles").update(patch as never).eq("id", data.profileId);
    if (error) return { ok: false as const, error: error.message };
    await logAudit(supabaseAdmin as never, actor, "trade.terms.updated", "profiles", data.profileId, patch);
    return { ok: true as const };
  });

/** Record an invoice, a payment received or an adjustment. */
export const addLedgerEntry = createServerFn({ method: "POST" })
  .inputValidator((data: { profileId: string; kind: "invoice" | "payment" | "adjustment"; amount: number; note?: string; dueDate?: string }) => ({
    profileId: text(data?.profileId, 40),
    kind: (["invoice", "payment", "adjustment"] as const).includes(data?.kind as never) ? data.kind : "payment",
    amount: Math.round((Number(data?.amount) || 0) * 100) / 100,
    note: text(data?.note, 200),
    dueDate: /^\d{4}-\d{2}-\d{2}$/.test(String(data?.dueDate)) ? String(data?.dueDate) : null,
  }))
  .handler(async ({ data }) => {
    const { requireStaff, logAudit } = await import("@/lib/staff.server");
    const actor = await requireStaff({ capability: "trade" });
    if (data.amount <= 0) return { ok: false as const, error: "Enter an amount." };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("trade_ledger").insert({
      profile_id: data.profileId,
      kind: data.kind,
      amount: data.amount,
      note: data.note || null,
      due_date: data.dueDate,
      created_by: actor.name,
    } as never);
    if (error) return { ok: false as const, error: error.message };

    // A payment settles the oldest unsettled invoices first.
    if (data.kind === "payment") {
      let left = data.amount;
      const { data: invoices } = await supabaseAdmin
        .from("trade_ledger")
        .select("id, amount")
        .eq("profile_id", data.profileId)
        .eq("kind", "invoice")
        .eq("settled", false)
        .order("created_at", { ascending: true });
      for (const inv of invoices ?? []) {
        if (left < Number(inv.amount)) break;
        left -= Number(inv.amount);
        await supabaseAdmin.from("trade_ledger").update({ settled: true } as never).eq("id", inv.id);
      }
    }

    await logAudit(supabaseAdmin as never, actor, `trade.ledger.${data.kind}`, "trade_ledger", data.profileId, {
      amount: data.amount,
      note: data.note,
    });
    return { ok: true as const };
  });

export type OutstandingRow = {
  profileId: string;
  name: string;
  phone: string | null;
  balance: number;
  creditLimit: number;
  oldestDue: string | null;
  overdue: boolean;
};

/** Who owes money, oldest unpaid invoice first. */
export const outstandingReport = createServerFn({ method: "POST" }).handler(async (): Promise<OutstandingRow[]> => {
  const { requireStaff } = await import("@/lib/staff.server");
  await requireStaff({ capability: "trade" });
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { tradeBalance } = await import("@/lib/trade.server");

  const { data: profiles } = await supabaseAdmin
    .from("profiles")
    .select("id, full_name, phone, credit_limit")
    .eq("customer_type", "trade")
    .limit(500);

  const rows = await Promise.all(
    (profiles ?? []).map(async (p) => {
      const credit = await tradeBalance(p.id);
      const { data: oldest } = await supabaseAdmin
        .from("trade_ledger")
        .select("due_date")
        .eq("profile_id", p.id)
        .eq("kind", "invoice")
        .eq("settled", false)
        .order("due_date", { ascending: true })
        .limit(1)
        .maybeSingle();
      return {
        profileId: p.id,
        name: String(p.full_name ?? "Trade customer"),
        phone: p.phone,
        balance: credit.balance,
        creditLimit: Number(p.credit_limit ?? 0),
        oldestDue: oldest?.due_date ?? null,
        overdue: credit.overdue,
      };
    }),
  );

  return rows
    .filter((r) => r.balance > 0)
    .sort((a, b) => (a.oldestDue ?? "9999").localeCompare(b.oldestDue ?? "9999"));
});

/** Set a tier as a percentage off retail for a whole category, in one go. */
export const applyCategoryDiscount = createServerFn({ method: "POST" })
  .inputValidator((data: { categorySlug: string; tier: string; percent: number; minQty?: number }) => ({
    categorySlug: text(data?.categorySlug, 80),
    tier: TIERS.includes(String(data?.tier) as never) ? String(data?.tier) : "trade",
    percent: Math.max(0, Math.min(90, Number(data?.percent) || 0)),
    minQty: Math.max(1, Math.min(9999, Math.round(Number(data?.minQty) || 1))),
  }))
  .handler(async ({ data }) => {
    const { requireStaff, logAudit } = await import("@/lib/staff.server");
    const actor = await requireStaff({ superAdmin: true });
    if (data.percent <= 0) return { ok: false as const, error: "Enter a discount percentage." };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: category } = await supabaseAdmin
      .from("categories")
      .select("id, name")
      .eq("slug", data.categorySlug)
      .maybeSingle();
    if (!category) return { ok: false as const, error: "Pick a category." };

    const { data: products } = await supabaseAdmin
      .from("products")
      .select("id, price")
      .eq("category_id", category.id)
      .not("price", "is", null)
      .limit(2000);

    const rows = (products ?? [])
      .filter((p) => Number(p.price) > 0)
      .map((p) => ({
        product_id: p.id,
        tier: data.tier,
        min_qty: data.minQty,
        price: Math.round(Number(p.price) * (1 - data.percent / 100) * 100) / 100,
      }));
    if (rows.length === 0) return { ok: false as const, error: "No priced products in this category yet." };

    const { error } = await supabaseAdmin
      .from("price_tiers")
      .upsert(rows as never, { onConflict: "product_id,tier,min_qty" });
    if (error) return { ok: false as const, error: error.message };

    await logAudit(supabaseAdmin as never, actor, "trade.tier.category", "categories", category.id, {
      tier: data.tier,
      percent: data.percent,
      minQty: data.minQty,
      products: rows.length,
    });
    return { ok: true as const, updated: rows.length };
  });

/** Per-product slab prices and the trade rules for that product. */
export const setProductTier = createServerFn({ method: "POST" })
  .inputValidator((data: {
    productId: string;
    tier: string;
    slabs: { minQty: number; price: number }[];
    minOrderQty?: number;
    orderMultiple?: number;
    tradeOnly?: boolean;
  }) => ({
    productId: text(data?.productId, 40),
    tier: TIERS.includes(String(data?.tier) as never) ? String(data?.tier) : "trade",
    slabs: (data?.slabs ?? [])
      .map((s) => ({ minQty: Math.max(1, Math.round(Number(s.minQty) || 1)), price: Math.max(0, Number(s.price) || 0) }))
      .filter((s) => s.price > 0)
      .slice(0, 6),
    minOrderQty: Math.max(1, Math.min(9999, Math.round(Number(data?.minOrderQty) || 1))),
    orderMultiple: Math.max(1, Math.min(999, Math.round(Number(data?.orderMultiple) || 1))),
    tradeOnly: Boolean(data?.tradeOnly),
  }))
  .handler(async ({ data }) => {
    const { requireStaff, logAudit } = await import("@/lib/staff.server");
    const actor = await requireStaff({ superAdmin: true });
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    await supabaseAdmin.from("price_tiers").delete().eq("product_id", data.productId).eq("tier", data.tier as never);
    if (data.slabs.length > 0) {
      await supabaseAdmin.from("price_tiers").insert(
        data.slabs.map((s) => ({ product_id: data.productId, tier: data.tier, min_qty: s.minQty, price: s.price })) as never,
      );
    }
    await supabaseAdmin
      .from("products")
      .update({ min_order_qty: data.minOrderQty, order_multiple: data.orderMultiple, trade_only: data.tradeOnly } as never)
      .eq("id", data.productId);

    await logAudit(supabaseAdmin as never, actor, "trade.tier.product", "products", data.productId, {
      tier: data.tier,
      slabs: data.slabs,
      minOrderQty: data.minOrderQty,
      orderMultiple: data.orderMultiple,
      tradeOnly: data.tradeOnly,
    });
    return { ok: true as const };
  });

/** Trade products and their slab prices, for the manager screen. */
export const listTradePricing = createServerFn({ method: "POST" })
  .inputValidator((data: { search?: string } | undefined) => ({ search: text(data?.search, 80) }))
  .handler(async ({ data }) => {
    const { requireStaff } = await import("@/lib/staff.server");
    await requireStaff({ capability: "trade" });
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let query = supabaseAdmin
      .from("products")
      .select("id, sku, name, price, trade_only, min_order_qty, order_multiple, price_tiers(tier, min_qty, price)")
      .order("name")
      .limit(60);
    if (data.search) query = query.or(`name.ilike.%${data.search}%,sku.ilike.%${data.search}%`);
    const { data: rows } = await query;
    return (rows ?? []).map((r) => ({
      id: String(r.id),
      sku: String(r.sku),
      name: String(r.name),
      price: r.price === null ? null : Number(r.price),
      tradeOnly: Boolean(r.trade_only),
      minOrderQty: Number(r.min_order_qty ?? 1),
      orderMultiple: Number(r.order_multiple ?? 1),
      slabs: ((r as { price_tiers?: { tier: string; min_qty: number; price: number }[] }).price_tiers ?? []).map((s) => ({
        tier: String(s.tier),
        minQty: Number(s.min_qty),
        price: Number(s.price),
      })),
    }));
  });
