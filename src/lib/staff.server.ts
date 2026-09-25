import { getRequestHeader } from "@tanstack/react-start/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { can, roleAtLeast, type StaffCapability, type StaffRole } from "@/lib/staff-permissions";

export type { StaffRole } from "@/lib/staff-permissions";

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

/** Throws unless the caller is signed in as staff with enough privilege. */
export async function requireStaff(opts?: {
  manager?: boolean;
  owner?: boolean;
  superAdmin?: boolean;
  capability?: StaffCapability;
}): Promise<StaffContext> {
  const ctx = await staffContext();
  if (!ctx) throw new Error("Staff sign-in required");
  if (opts?.superAdmin && ctx.role !== "super_admin") {
    throw new Error("Only a super admin can change this");
  }
  if (opts?.owner && !roleAtLeast(ctx.role, "owner")) throw new Error("Only an owner can do this");
  if (opts?.manager && !roleAtLeast(ctx.role, "manager")) throw new Error("Manager access required");
  if (opts?.capability && !can(ctx.role, opts.capability)) throw new Error("You do not have access to this section");
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
