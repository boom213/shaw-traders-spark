import { createServerFn } from "@tanstack/react-start";
import { CATEGORY_ICON_KEYS, isCategoryIconKey } from "@/lib/category-icon-keys";

type Row = Record<string, unknown>;

export type AdminCategory = {
  id: string;
  slug: string;
  name: string;
  blurb: string;
  icon: string;
  sortOrder: number;
  productCount: number;
};

const clean = (value: unknown, max: number) => String(value ?? "").trim().slice(0, max);
const slugify = (value: unknown) =>
  clean(value, 160).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

async function ownerAdmin() {
  const { requireStaff, logAudit } = await import("@/lib/staff.server");
  const actor = await requireStaff({ capability: "settings" });
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return { sb: supabaseAdmin, actor, logAudit };
}

export const listAdminCategories = createServerFn({ method: "POST" }).handler(async (): Promise<AdminCategory[]> => {
  const { sb } = await ownerAdmin();
  const { data, error } = await sb
    .from("categories")
    .select("id, slug, name, blurb, icon, sort_order, products(id)")
    .order("sort_order")
    .order("name");
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => {
    const item = row as Row;
    return {
      id: String(item['id']),
      slug: String(item['slug']),
      name: String(item['name']),
      blurb: String(item['blurb'] ?? ""),
      icon: String(item['icon'] ?? "package"),
      sortOrder: Number(item['sort_order'] ?? 0),
      productCount: Array.isArray(item['products']) ? item['products'].length : 0,
    };
  });
});

export const saveCategory = createServerFn({ method: "POST" })
  .inputValidator((input: { id?: string; name: string; slug: string; blurb?: string; icon: string }) => ({
    id: clean(input?.id, 40),
    name: clean(input?.name, 100),
    slug: slugify(input?.slug),
    blurb: clean(input?.blurb, 240),
    icon: clean(input?.icon, 40),
  }))
  .handler(async ({ data }) => {
    const { sb, actor, logAudit } = await ownerAdmin();
    if (data.name.length < 2) return { ok: false as const, error: "Enter a category name." };
    if (!data.slug) return { ok: false as const, error: "Enter a valid category URL slug." };
    if (!isCategoryIconKey(data.icon)) return { ok: false as const, error: "Choose an icon from the list." };

    let duplicateQuery = sb.from("categories").select("id").or(`slug.eq.${data.slug},name.ilike.${data.name}`);
    if (data.id) duplicateQuery = duplicateQuery.neq("id", data.id);
    const { data: duplicate } = await duplicateQuery.limit(1).maybeSingle();
    if (duplicate) return { ok: false as const, error: "A category with that name or URL slug already exists." };

    const row = { name: data.name, slug: data.slug, blurb: data.blurb || null, icon: data.icon };
    if (data.id) {
      const { data: before } = await sb.from("categories").select("name, slug, blurb, icon").eq("id", data.id).maybeSingle();
      if (!before) return { ok: false as const, error: "Category not found." };
      const { error } = await sb.from("categories").update(row).eq("id", data.id);
      if (error) return { ok: false as const, error: error.code === "23505" ? "That category URL is already in use." : error.message };
      await logAudit(sb as never, actor, "categories.updated", "categories", data.id, { from: before, to: row });
      return { ok: true as const, id: data.id };
    }

    const { data: last } = await sb.from("categories").select("sort_order").order("sort_order", { ascending: false }).limit(1).maybeSingle();
    const { data: made, error } = await sb.from("categories").insert({ ...row, sort_order: Number(last?.sort_order ?? 0) + 1 }).select("id").single();
    if (error) return { ok: false as const, error: error.code === "23505" ? "That category URL is already in use." : error.message };
    await logAudit(sb as never, actor, "categories.created", "categories", made.id, row);
    return { ok: true as const, id: made.id };
  });

export const reorderCategories = createServerFn({ method: "POST" })
  .inputValidator((input: { ids: string[] }) => ({
    ids: (Array.isArray(input?.ids) ? input.ids : []).map((id) => clean(id, 40)).filter(Boolean).slice(0, 100),
  }))
  .handler(async ({ data }) => {
    const { sb, actor, logAudit } = await ownerAdmin();
    if (data.ids.length === 0 || new Set(data.ids).size !== data.ids.length) {
      return { ok: false as const, error: "Category order is invalid." };
    }
    const { error } = await sb.rpc("reorder_categories", { p_ids: data.ids });
    if (error) return { ok: false as const, error: error.message };
    await logAudit(sb as never, actor, "categories.reordered", "categories", null, { ids: data.ids });
    return { ok: true as const };
  });

export const deleteCategory = createServerFn({ method: "POST" })
  .inputValidator((input: { id: string }) => ({ id: clean(input?.id, 40) }))
  .handler(async ({ data }) => {
    const { sb, actor, logAudit } = await ownerAdmin();
    const { data: category } = await sb.from("categories").select("id, name, slug").eq("id", data.id).maybeSingle();
    if (!category) return { ok: false as const, error: "Category not found." };
    const { count, error: countError } = await sb.from("products").select("id", { count: "exact", head: true }).eq("category_id", data.id);
    if (countError) return { ok: false as const, error: countError.message };
    if ((count ?? 0) > 0) {
      return { ok: false as const, error: "Reassign or remove its products before deleting this category." };
    }
    const { error } = await sb.from("categories").delete().eq("id", data.id);
    if (error) return { ok: false as const, error: error.message };
    await logAudit(sb as never, actor, "categories.deleted", "categories", data.id, category);
    return { ok: true as const };
  });

export const categoryIconKeys = CATEGORY_ICON_KEYS;