import { createServerFn } from "@tanstack/react-start";

const WINDOW_MINUTES = 15;
const MAX_FAILURES = 5;

const clean = (v: unknown) => String(v ?? "").trim();
const lower = (v: unknown) => clean(v).toLowerCase();

export type StaffMember = {
  profileId: string;
  name: string;
  email: string;
  role: "owner" | "manager" | "staff";
  since: string;
  isYou: boolean;
};

/** Who is signed in to the manager panel on this request. */
export const staffSession = createServerFn({ method: "POST" }).handler(async () => {
  const { staffContext } = await import("@/lib/staff.server");
  const ctx = await staffContext();
  return ctx ? { signedIn: true as const, name: ctx.name, email: ctx.email, role: ctx.role } : { signedIn: false as const };
});

/** True while no staff account exists, so the first owner can be created. */
export const staffBootstrapNeeded = createServerFn({ method: "POST" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { count } = await supabaseAdmin.from("staff_roles").select("profile_id", { count: "exact", head: true });
  return { needed: (count ?? 0) === 0 };
});

/** Rate limit: five failed sign-ins per email per 15 minutes. */
export const staffSignInAllowed = createServerFn({ method: "POST" })
  .inputValidator((data: { email: string }) => ({ email: lower(data?.email) }))
  .handler(async ({ data }) => {
    if (!data.email) return { allowed: false as const, waitMinutes: 0 };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const since = new Date(Date.now() - WINDOW_MINUTES * 60_000).toISOString();
    const { data: rows } = await supabaseAdmin
      .from("auth_attempts")
      .select("ok, created_at")
      .eq("identifier", data.email)
      .eq("kind", "staff_signin")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(20);

    const failures = (rows ?? []).filter((r) => !r.ok);
    if (failures.length < MAX_FAILURES) return { allowed: true as const, waitMinutes: 0 };
    const newest = new Date(String(failures[0]?.created_at ?? Date.now())).getTime();
    const waitMinutes = Math.max(1, Math.ceil((newest + WINDOW_MINUTES * 60_000 - Date.now()) / 60_000));
    return { allowed: false as const, waitMinutes };
  });

/** Log the outcome of a staff sign-in attempt. */
export const recordStaffSignIn = createServerFn({ method: "POST" })
  .inputValidator((data: { email: string; ok: boolean }) => ({ email: lower(data?.email), ok: Boolean(data?.ok) }))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("auth_attempts").insert({ identifier: data.email, kind: "staff_signin", ok: data.ok });
    if (data.ok) {
      await supabaseAdmin
        .from("auth_attempts")
        .delete()
        .eq("identifier", data.email)
        .eq("kind", "staff_signin")
        .eq("ok", false);
    }
    return { ok: true as const };
  });

async function ensureProfile(sb: Awaited<ReturnType<typeof adminClient>>, id: string, name: string, email: string) {
  await sb.from("profiles").upsert({ id, full_name: name, email } as never);
}

async function adminClient() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

/** First run only: create the owner account while no staff exists. */
export const claimFirstOwner = createServerFn({ method: "POST" })
  .inputValidator((data: { email: string; password: string; name: string }) => ({
    email: lower(data?.email),
    password: String(data?.password ?? ""),
    name: clean(data?.name),
  }))
  .handler(async ({ data }) => {
    if (!data.email.includes("@")) return { error: "Enter a valid email address." };
    if (data.password.length < 8) return { error: "Use a password of at least 8 characters." };
    if (data.name.length < 2) return { error: "Enter the owner's name." };

    const sb = await adminClient();
    const { count } = await sb.from("staff_roles").select("profile_id", { count: "exact", head: true });
    if ((count ?? 0) > 0) return { error: "Staff accounts already exist. Ask the owner to invite you." };

    const { data: created, error } = await sb.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.name },
    });
    if (error || !created.user) return { error: error?.message ?? "Could not create the owner account." };

    await ensureProfile(sb, created.user.id, data.name, data.email);
    const { error: roleError } = await sb.from("staff_roles").insert({ profile_id: created.user.id, role: "owner" });
    if (roleError) return { error: roleError.message };

    await sb.from("audit_log").insert({
      actor: `${data.name} <${data.email}> (owner)`,
      action: "staff.owner_created",
      entity: "staff_roles",
      entity_id: created.user.id,
      diff: { role: "owner" } as never,
    });
    return { ok: true as const };
  });

/** Everyone with access to the manager panel. */
export const listStaff = createServerFn({ method: "POST" }).handler(async (): Promise<StaffMember[]> => {
  const { requireStaff } = await import("@/lib/staff.server");
  const me = await requireStaff();
  const sb = await adminClient();
  const { data: rows } = await sb
    .from("staff_roles")
    .select("profile_id, role, created_at, profiles(full_name, email)")
    .order("created_at");
  return (rows ?? []).map((r) => {
    const p = (r as { profiles?: { full_name: string | null; email: string | null } | null }).profiles;
    return {
      profileId: String(r.profile_id),
      name: p?.full_name ?? "Staff member",
      email: p?.email ?? "",
      role: r.role as StaffMember["role"],
      since: String(r.created_at),
      isYou: r.profile_id === me.userId,
    };
  });
});

/** Owner invites a staff member and receives a one-time password to pass on. */
export const inviteStaff = createServerFn({ method: "POST" })
  .inputValidator((data: { email: string; name: string; role: string }) => ({
    email: lower(data?.email),
    name: clean(data?.name),
    role: (["owner", "manager", "staff"].includes(String(data?.role)) ? String(data?.role) : "staff") as
      | "owner"
      | "manager"
      | "staff",
  }))
  .handler(async ({ data }) => {
    const { requireStaff, logAudit } = await import("@/lib/staff.server");
    const me = await requireStaff({ owner: true });
    if (!data.email.includes("@")) return { error: "Enter a valid email address." };
    if (data.name.length < 2) return { error: "Enter their name." };

    const sb = await adminClient();
    const tempPassword = `Shaw-${Math.random().toString(36).slice(2, 8)}${Math.floor(Math.random() * 90 + 10)}`;

    let userId: string | null = null;
    const { data: created, error } = await sb.auth.admin.createUser({
      email: data.email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { full_name: data.name },
    });
    if (created?.user) {
      userId = created.user.id;
    } else if (error && /already/i.test(error.message)) {
      const { data: list } = await sb.auth.admin.listUsers({ page: 1, perPage: 1000 });
      userId = list.users.find((u) => (u.email ?? "").toLowerCase() === data.email)?.id ?? null;
    }
    if (!userId) return { error: error?.message ?? "Could not create that account." };

    await ensureProfile(sb, userId, data.name, data.email);
    const { error: roleError } = await sb
      .from("staff_roles")
      .upsert({ profile_id: userId, role: data.role }, { onConflict: "profile_id,role" });
    if (roleError) return { error: roleError.message };

    await logAudit(sb as never, me, "staff.invited", "staff_roles", userId, { email: data.email, role: data.role });
    return {
      ok: true as const,
      tempPassword: created?.user ? tempPassword : null,
    };
  });

/** Owner removes someone's access. The person keeps their login but loses the panel. */
export const revokeStaff = createServerFn({ method: "POST" })
  .inputValidator((data: { profileId: string }) => ({ profileId: clean(data?.profileId) }))
  .handler(async ({ data }) => {
    const { requireStaff, logAudit } = await import("@/lib/staff.server");
    const me = await requireStaff({ owner: true });
    if (data.profileId === me.userId) return { error: "You cannot remove your own access." };

    const sb = await adminClient();
    const { count } = await sb
      .from("staff_roles")
      .select("profile_id", { count: "exact", head: true })
      .eq("role", "owner");
    const { data: target } = await sb
      .from("staff_roles")
      .select("role")
      .eq("profile_id", data.profileId)
      .maybeSingle();
    if (target?.role === "owner" && (count ?? 0) <= 1) return { error: "Keep at least one owner." };

    const { error } = await sb.from("staff_roles").delete().eq("profile_id", data.profileId);
    if (error) return { error: error.message };
    await logAudit(sb as never, me, "staff.revoked", "staff_roles", data.profileId, { removed: true });
    return { ok: true as const };
  });

/** Recent changes made by staff, newest first. */
export const recentAudit = createServerFn({ method: "POST" }).handler(async () => {
  const { requireStaff } = await import("@/lib/staff.server");
  await requireStaff();
  const sb = await adminClient();
  const { data: rows } = await sb
    .from("audit_log")
    .select("id, actor, action, entity, entity_id, diff, created_at")
    .order("created_at", { ascending: false })
    .limit(50);
  return (rows ?? []).map((r) => ({
    id: String(r.id),
    actor: r.actor ?? "Unknown",
    action: String(r.action),
    entity: r.entity ?? "",
    at: String(r.created_at),
  }));
});
