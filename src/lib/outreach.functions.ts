import { createServerFn } from "@tanstack/react-start";

type Row = Record<string, unknown>;
export type OutreachStatus = "pending" | "sent" | "skipped";

async function outreachAdmin() {
  const { requireStaff, logAudit } = await import("@/lib/staff.server");
  const actor = await requireStaff({ capability: "operations" });
  const { supabaseAdmin: sb } = await import("@/integrations/supabase/client.server");
  return { sb, actor, logAudit };
}

export function buildOutreachWhatsAppUrl(phone: string, message: string, linkUrl?: string | null): string {
  const body = `${message}${linkUrl ? `\n\n${linkUrl}` : ""}`;
  return `https://wa.me/${phone}?text=${encodeURIComponent(body)}`;
}

export const uploadOutreachCsv = createServerFn({ method: "POST" })
  .inputValidator((input: { name: string; csv: string }) => ({
    name: String(input?.name ?? "").trim().slice(0, 160),
    csv: String(input?.csv ?? "").slice(0, 4_000_000),
  }))
  .handler(async ({ data }) => {
    const { sb, actor, logAudit } = await outreachAdmin();
    if (!data.name) return { ok: false as const, error: "Enter a list name." };
    const { parseOutreachCsv } = await import("@/lib/outreach.server");
    const parsed = parseOutreachCsv(data.csv);
    if (parsed.error) return { ok: false as const, error: parsed.error };
    if (parsed.contacts.length === 0) {
      return { ok: false as const, error: "No valid contacts were found.", rejected: parsed.rejected, duplicatesSkipped: parsed.duplicatesSkipped };
    }
    const uploadedBy = `${actor.name} <${actor.email}> (${actor.role})`;
    const { data: listId, error } = await sb.rpc("create_outreach_list", {
      p_name: data.name,
      p_uploaded_by: uploadedBy,
      p_contacts: parsed.contacts,
    });
    if (error || !listId) return { ok: false as const, error: error?.message ?? "Could not create the outreach list." };
    await logAudit(sb as never, actor, "outreach.list_created", "outreach_lists", String(listId), {
      name: data.name,
      imported: parsed.contacts.length,
      rejected: parsed.rejected.length,
      duplicatesSkipped: parsed.duplicatesSkipped,
    });
    return {
      ok: true as const,
      listId: String(listId),
      imported: parsed.contacts.length,
      rejected: parsed.rejected,
      duplicatesSkipped: parsed.duplicatesSkipped,
    };
  });

export type OutreachListSummary = {
  id: string;
  name: string;
  uploadedBy: string | null;
  total: number;
  pending: number;
  sent: number;
  skipped: number;
  createdAt: string;
};

export const listOutreachLists = createServerFn({ method: "POST" }).handler(async (): Promise<OutreachListSummary[]> => {
  const { sb } = await outreachAdmin();
  const { data: lists, error } = await sb.from("outreach_lists").select("id, name, uploaded_by, total, created_at").order("created_at", { ascending: false }).limit(500);
  if (error) throw new Error(error.message);
  return Promise.all(((lists ?? []) as Row[]).map(async (list) => {
    const id = String(list['id']);
    const counts = await Promise.all((["pending", "sent", "skipped"] as const).map(async (status) => {
      const { count, error: countError } = await sb.from("outreach_contacts").select("id", { count: "exact", head: true }).eq("list_id", id).eq("status", status);
      if (countError) throw new Error(countError.message);
      return count ?? 0;
    }));
    return {
      id,
      name: String(list['name']),
      uploadedBy: list['uploaded_by'] ? String(list['uploaded_by']) : null,
      total: Number(list['total'] ?? 0),
      pending: counts[0] ?? 0,
      sent: counts[1] ?? 0,
      skipped: counts[2] ?? 0,
      createdAt: String(list['created_at']),
    };
  }));
});

export type OutreachContact = {
  id: string;
  name: string | null;
  phone: string;
  message: string;
  linkUrl: string | null;
  status: OutreachStatus;
  skipReason: string | null;
  sentAt: string | null;
  sentBy: string | null;
};

export const outreachContacts = createServerFn({ method: "POST" })
  .inputValidator((input: { listId: string; status?: string; search?: string; page?: number }) => ({
    listId: String(input?.listId ?? "").trim(),
    status: (["pending", "sent", "skipped", "all"].includes(String(input?.status)) ? String(input.status) : "pending") as OutreachStatus | "all",
    search: String(input?.search ?? "").trim().slice(0, 120).replace(/[%_,()]/g, " "),
    page: Math.max(0, Math.floor(Number(input?.page ?? 0))),
  }))
  .handler(async ({ data }): Promise<{ items: OutreachContact[]; total: number; counts: Record<OutreachStatus, number> }> => {
    const { sb } = await outreachAdmin();
    let query = sb.from("outreach_contacts").select("id, name, phone, message, link_url, status, skip_reason, sent_at, sent_by", { count: "exact" }).eq("list_id", data.listId);
    if (data.status !== "all") query = query.eq("status", data.status);
    if (data.search) query = query.or(`name.ilike.%${data.search}%,phone.ilike.%${data.search}%`);
    const from = data.page * 8;
    const { data: rows, count, error } = await query.order("created_at").range(from, from + 7);
    if (error) throw new Error(error.message);
    const countValues = await Promise.all((["pending", "sent", "skipped"] as const).map(async (status) => {
      const { count: statusCount, error: countError } = await sb.from("outreach_contacts").select("id", { count: "exact", head: true }).eq("list_id", data.listId).eq("status", status);
      if (countError) throw new Error(countError.message);
      return statusCount ?? 0;
    }));
    return {
      items: ((rows ?? []) as Row[]).map((row) => ({
        id: String(row['id']), name: row['name'] ? String(row['name']) : null, phone: String(row['phone']), message: String(row['message']),
        linkUrl: row['link_url'] ? String(row['link_url']) : null, status: String(row['status']) as OutreachStatus,
        skipReason: row['skip_reason'] ? String(row['skip_reason']) : null, sentAt: row['sent_at'] ? String(row['sent_at']) : null,
        sentBy: row['sent_by'] ? String(row['sent_by']) : null,
      })),
      total: count ?? 0,
      counts: { pending: countValues[0] ?? 0, sent: countValues[1] ?? 0, skipped: countValues[2] ?? 0 },
    };
  });

export const markOutreachSent = createServerFn({ method: "POST" })
  .inputValidator((input: { contactId: string }) => ({ contactId: String(input?.contactId ?? "").trim() }))
  .handler(async ({ data }) => {
    const { sb, actor, logAudit } = await outreachAdmin();
    const sentBy = `${actor.name} <${actor.email}> (${actor.role})`;
    const { data: contact, error: readError } = await sb.from("outreach_contacts").select("id, list_id, status").eq("id", data.contactId).maybeSingle();
    if (readError || !contact) return { ok: false as const, error: readError?.message ?? "Contact not found." };
    if (contact.status === "sent") return { ok: true as const, changed: false };
    const { error } = await sb.from("outreach_contacts").update({ status: "sent", sent_at: new Date().toISOString(), sent_by: sentBy, skip_reason: null }).eq("id", data.contactId);
    if (error) return { ok: false as const, error: error.message };
    await logAudit(sb as never, actor, "outreach.contact_opened", "outreach_contacts", data.contactId, { listId: contact.list_id, previousStatus: contact.status });
    return { ok: true as const, changed: true };
  });

export const markOutreachSkipped = createServerFn({ method: "POST" })
  .inputValidator((input: { contactId: string; reason: string }) => ({ contactId: String(input?.contactId ?? "").trim(), reason: String(input?.reason ?? "").trim().slice(0, 500) }))
  .handler(async ({ data }) => {
    const { sb, actor, logAudit } = await outreachAdmin();
    if (!data.reason) return { ok: false as const, error: "Enter a short reason." };
    const { data: contact, error: readError } = await sb.from("outreach_contacts").select("id, list_id, status").eq("id", data.contactId).maybeSingle();
    if (readError || !contact) return { ok: false as const, error: readError?.message ?? "Contact not found." };
    const { error } = await sb.from("outreach_contacts").update({ status: "skipped", skip_reason: data.reason, sent_at: null, sent_by: null }).eq("id", data.contactId);
    if (error) return { ok: false as const, error: error.message };
    await logAudit(sb as never, actor, "outreach.contact_skipped", "outreach_contacts", data.contactId, { listId: contact.list_id, previousStatus: contact.status, reason: data.reason });
    return { ok: true as const };
  });

export const deleteOutreachList = createServerFn({ method: "POST" })
  .inputValidator((input: { listId: string; confirmed: boolean }) => ({ listId: String(input?.listId ?? "").trim(), confirmed: input?.confirmed === true }))
  .handler(async ({ data }) => {
    const { sb, actor, logAudit } = await outreachAdmin();
    if (!data.confirmed) return { ok: false as const, error: "Confirm that you want to delete this list." };
    const { data: list, error: readError } = await sb.from("outreach_lists").select("id, name, total").eq("id", data.listId).maybeSingle();
    if (readError || !list) return { ok: false as const, error: readError?.message ?? "Outreach list not found." };
    await logAudit(sb as never, actor, "outreach.list_deleted", "outreach_lists", data.listId, { name: list.name, total: list.total });
    const { error } = await sb.from("outreach_lists").delete().eq("id", data.listId);
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const };
  });