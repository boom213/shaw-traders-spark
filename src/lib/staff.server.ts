import { getRequestHeader } from "@tanstack/react-start/server";
import type { SupabaseClient } from "@supabase/supabase-js";

export type StaffRole = "super_admin" | "owner" | "manager" | "staff";

export type StaffContext = {
  userId: string;
  email: string;
  name: string;
  role: StaffRole;
};

/**
 * Permanent super admins, seeded from the SUPER_ADMIN_EMAILS environment
 * variable (comma separated). Never hardcode the addresses here.
 */
export function superAdminEmails(): string[] {
  return String(process.env['SUPER_ADMIN_EMAILS'] ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter((e) => e.includes("@"));
}

export const isSuperAdminEmail = (email: string) =>
  superAdminEmails().includes(String(email ?? "").trim().toLowerCase());

/** Bearer token attached by the client middleware, if any. */
export function bearerToken(): string | null {
  const header = getRequestHeader("authorization");
  const token = header?.replace(/^Bearer\s+/i, "").trim();
  return token && token.length > 10 ? token : null;
}

/** Resolve the signed-in staff member for this request, or null. */
export async function staffContext(): Promise<StaffContext | null> {
  const token = bearerToken();
  if (!token) return null;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: auth } = await supabaseAdmin.auth.getUser(token);
  const user = auth.user;
  if (!user) return null;

  const email = (user.email ?? "").toLowerCase();
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("full_name, email")
    .eq("id", user.id)
    .maybeSingle();
  const name = profile?.full_name ?? user.email ?? "Staff";

  // Anyone on the allowlist is a super admin from their first sign-in onwards.
  if (isSuperAdminEmail(email)) {
    if (!profile) {
      await supabaseAdmin.from("profiles").upsert({ id: user.id, full_name: name, email } as never);
    }
    await supabaseAdmin
      .from("staff_roles")
      .upsert({ profile_id: user.id, role: "super_admin" } as never, { onConflict: "profile_id,role" });
    return { userId: user.id, email: profile?.email ?? email, name, role: "super_admin" };
  }

  // One person may hold more than one role; this function returns the
  // highest-privilege one, so two rows never lock a staff member out.
  const { data: role } = await supabaseAdmin.rpc("staff_role", { _user_id: user.id });
  if (!role) return null;

  return {
    userId: user.id,
    email: profile?.email ?? email,
    name,
    role: role as StaffRole,
  };
}

const RANK: Record<StaffRole, number> = { super_admin: 0, owner: 1, manager: 2, staff: 3 };

/** Throws unless the caller is signed in as staff with enough privilege. */
export async function requireStaff(opts?: { owner?: boolean; superAdmin?: boolean }): Promise<StaffContext> {
  const ctx = await staffContext();
  if (!ctx) throw new Error("Staff sign-in required");
  if (opts?.superAdmin && ctx.role !== "super_admin") {
    throw new Error("Only a super admin can change this");
  }
  if (opts?.owner && RANK[ctx.role] > RANK["owner"]) throw new Error("Only the owner can do this");
  return ctx;
}

/** Record who changed what, so every price, stock and order edit is traceable. */
export async function logAudit(
  sb: SupabaseClient<never>,
  actor: StaffContext,
  action: string,
  entity: string,
  entityId: string | null,
  diff: Record<string, unknown>,
): Promise<void> {
  await sb.from("audit_log").insert({
    actor: `${actor.name} <${actor.email}> (${actor.role})`,
    action,
    entity,
    entity_id: entityId,
    diff: diff as never,
  } as never);
}
