import { createServerFn } from "@tanstack/react-start";

const WINDOW_MINUTES = 15;
const MAX_FAILURES = 5;

const clean = (v: unknown) => String(v ?? "").trim();
const lower = (v: unknown) => clean(v).toLowerCase();

export type StaffRoleName = "super_admin" | "owner" | "manager" | "staff";

export type StaffMember = {
  profileId: string;
  name: string;
  email: string;
  role: StaffRoleName;
  since: string;
  isYou: boolean;
  locked: boolean;
};

/** Who is signed in to the manager panel on this request. */
export const staffSession = createServerFn({ method: "POST" }).handler(async () => {
  const { staffContext } = await import("@/lib/staff.server");
  const ctx = await staffContext();
  return ctx
    ? {
        signedIn: true as const,
        name: ctx.name,
        email: ctx.email,
        role: ctx.role,
        superAdmin: ctx.role === "super_admin",
      }
    : { signedIn: false as const };
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

async function adminClient() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

async function ensureProfile(sb: Awaited<ReturnType<typeof adminClient>>, id: string, name: string, email: string) {
  await sb.from("profiles").upsert({ id, full_name: name, email } as never);
}

/**
 * A permanent super admin setting their password for the first time. Only
 * addresses on the SUPER_ADMIN_EMAILS allowlist can use this, and only while
 * they have no account yet.
 */
export const claimSuperAdmin = createServerFn({ method: "POST" })
  .inputValidator((data: { email: string; password: string; name: string }) => ({
    email: lower(data?.email),
    password: String(data?.password ?? ""),
    name: clean(data?.name),
  }))
  .handler(async ({ data }) => {
    const { isSuperAdminEmail } = await import("@/lib/staff.server");
    if (!isSuperAdminEmail(data.email)) {
      return { error: "This email is not allowed to open the manager panel." };
    }
    if (data.password.length < 8) return { error: "Use a password of at least 8 characters." };
    if (data.name.length < 2) return { error: "Enter your name." };

    const sb = await adminClient();
    const { data: created, error } = await sb.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.name },
    });
    if (error || !created.user) {
      return { error: /already/i.test(error?.message ?? "") ? "You already have an account — sign in with your password." : error?.message ?? "Could not create the account." };
    }

    await ensureProfile(sb, created.user.id, data.name, data.email);
    const { error: roleError } = await sb
      .from("staff_roles")
      .upsert({ profile_id: created.user.id, role: "super_admin" } as never, { onConflict: "profile_id,role" });
    if (roleError) return { error: roleError.message };

    await sb.from("audit_log").insert({
      actor: `${data.name} <${data.email}> (super_admin)`,
      action: "staff.super_admin_activated",
      entity: "staff_roles",
      entity_id: created.user.id,
      diff: { role: "super_admin" } as never,
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

  const best = new Map<string, StaffMember>();
  const rank: Record<string, number> = { super_admin: 0, owner: 1, manager: 2, staff: 3 };
  for (const r of rows ?? []) {
    const p = (r as { profiles?: { full_name: string | null; email: string | null } | null }).profiles;
    const role = r.role as StaffRoleName;
    const entry: StaffMember = {
      profileId: String(r.profile_id),
      name: p?.full_name ?? "Staff member",
      email: p?.email ?? "",
      role,
      since: String(r.created_at),
      isYou: r.profile_id === me.userId,
      locked: role === "super_admin",
    };
    const current = best.get(entry.profileId);
    if (!current || rank[role]! < rank[current.role]!) best.set(entry.profileId, entry);
  }
  return [...best.values()].sort((a, b) => rank[a.role]! - rank[b.role]! || a.name.localeCompare(b.name));
});

/** A super admin invites someone and receives a one-time password to pass on. */
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
    const { requireStaff, logAudit, isSuperAdminEmail } = await import("@/lib/staff.server");
    const me = await requireStaff({ superAdmin: true });
    if (!data.email.includes("@")) return { error: "Enter a valid email address." };
    if (data.name.length < 2) return { error: "Enter their name." };
    if (isSuperAdminEmail(data.email)) {
      return { error: "That address is already a permanent super admin." };
    }

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
    await sb.from("staff_roles").delete().eq("profile_id", userId);
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

/** A super admin removes someone's access. Super admins cannot be removed. */
export const revokeStaff = createServerFn({ method: "POST" })
  .inputValidator((data: { profileId: string }) => ({ profileId: clean(data?.profileId) }))
  .handler(async ({ data }) => {
    const { requireStaff, logAudit, isSuperAdminEmail } = await import("@/lib/staff.server");
    const me = await requireStaff({ superAdmin: true });
    if (data.profileId === me.userId) return { error: "You cannot remove your own access." };

    const sb = await adminClient();
    const { data: roles } = await sb.from("staff_roles").select("role").eq("profile_id", data.profileId);
    if ((roles ?? []).some((r) => r.role === "super_admin")) {
      return { error: "Super admins cannot be removed." };
    }
    const { data: person } = await sb.from("profiles").select("email").eq("id", data.profileId).maybeSingle();
    if (person?.email && isSuperAdminEmail(person.email)) {
      return { error: "Super admins cannot be removed." };
    }

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
