/**
 * A staff member may hold more than one role. Resolving the role must return
 * the highest-privilege one rather than failing on multiple rows.
 */
import { createClient } from "@supabase/supabase-js";
import { afterAll, describe, expect, it } from "vitest";

const url = process.env['SUPABASE_URL'] ?? process.env['VITE_SUPABASE_URL'] ?? "";
const serviceKey = process.env['SUPABASE_SERVICE_ROLE_KEY'] ?? "";
const sb = createClient(url, serviceKey, { auth: { persistSession: false } });

const profileIds: string[] = [];

async function makeProfile() {
  const id = crypto.randomUUID();
  const { error } = await sb.from("profiles").insert({ id, full_name: `Role test ${id.slice(0, 8)}` });
  if (error) throw new Error(error.message);
  profileIds.push(id);
  return id;
}

afterAll(async () => {
  if (profileIds.length) {
    await sb.from("staff_roles").delete().in("profile_id", profileIds);
    await sb.from("profiles").delete().in("id", profileIds);
  }
});

describe("staff_role", () => {
  it("returns the highest role when one person holds two", async () => {
    const id = await makeProfile();
    await sb.from("staff_roles").insert([
      { profile_id: id, role: "staff" },
      { profile_id: id, role: "owner" },
    ]);
    const { data, error } = await sb.rpc("staff_role", { _user_id: id });
    expect(error).toBeNull();
    expect(data).toBe("owner");
  });

  it("returns nothing for someone who is not staff", async () => {
    const id = await makeProfile();
    const { data } = await sb.rpc("staff_role", { _user_id: id });
    expect(data).toBeNull();
  });
});
