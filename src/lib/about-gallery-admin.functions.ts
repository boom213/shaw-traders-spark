import { createServerFn } from "@tanstack/react-start";

export type AboutPhoto = {
  id: string;
  imageUrl: string | null;
  caption: string | null;
  sortOrder: number;
  isActive: boolean;
};

const MAX_PHOTOS = 12;

const clean = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);
const orNull = (v: unknown, max: number) => (clean(v, max) ? clean(v, max) : null);

const SELECT = "id, image_url, caption, sort_order, is_active";

const mapRow = (r: Record<string, unknown>): AboutPhoto => ({
  id: String(r['id']),
  imageUrl: (r['image_url'] as string) ?? null,
  caption: (r['caption'] as string) ?? null,
  sortOrder: Number(r['sort_order'] ?? 0),
  isActive: Boolean(r['is_active']),
});

/** Every About page photo, in display order — including the switched-off ones. */
export const listPhotos = createServerFn({ method: "POST" }).handler(async (): Promise<AboutPhoto[]> => {
  const { requireStaff } = await import("@/lib/staff.server");
  await requireStaff({ capability: "content" });
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin.from("about_gallery_photos").select(SELECT).order("sort_order").limit(50);
  return (data ?? []).map((r) => mapRow(r as Record<string, unknown>));
});

/** Create or update one photo. */
export const savePhoto = createServerFn({ method: "POST" })
  .inputValidator((data: { id?: string; imageUrl?: string; caption?: string; isActive?: boolean }) => ({
    id: clean(data?.id, 40),
    imageUrl: orNull(data?.imageUrl, 400),
    caption: orNull(data?.caption, 160),
    isActive: data?.isActive !== false,
  }))
  .handler(async ({ data }) => {
    const { requireStaff, logAudit } = await import("@/lib/staff.server");
    const actor = await requireStaff({ capability: "content" });
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const row = { image_url: data.imageUrl, caption: data.caption, is_active: data.isActive };

    if (data.id) {
      const { error } = await supabaseAdmin.from("about_gallery_photos").update(row as never).eq("id", data.id);
      if (error) return { ok: false as const, error: error.message };
      await logAudit(supabaseAdmin as never, actor, "about_photo.updated", "about_gallery_photos", data.id, row);
      return { ok: true as const, id: data.id };
    }

    if (!data.imageUrl) return { ok: false as const, error: "Choose a photo first." };

    const { count } = await supabaseAdmin.from("about_gallery_photos").select("id", { count: "exact", head: true });
    if ((count ?? 0) >= MAX_PHOTOS)
      return { ok: false as const, error: `You can keep up to ${MAX_PHOTOS} photos. Delete one first.` };

    const { data: made, error } = await supabaseAdmin
      .from("about_gallery_photos")
      .insert({ ...row, sort_order: (count ?? 0) + 1 } as never)
      .select("id")
      .maybeSingle();
    if (error) return { ok: false as const, error: error.message };
    await logAudit(supabaseAdmin as never, actor, "about_photo.created", "about_gallery_photos", String(made?.id ?? ""), row);
    return { ok: true as const, id: String(made?.id ?? "") };
  });

/** Turn one photo on or off without deleting it. */
export const togglePhoto = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string; isActive: boolean }) => ({
    id: clean(data?.id, 40),
    isActive: Boolean(data?.isActive),
  }))
  .handler(async ({ data }) => {
    const { requireStaff, logAudit } = await import("@/lib/staff.server");
    const actor = await requireStaff({ capability: "content" });
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("about_gallery_photos")
      .update({ is_active: data.isActive } as never)
      .eq("id", data.id);
    if (error) return { ok: false as const, error: error.message };
    await logAudit(supabaseAdmin as never, actor, "about_photo.toggled", "about_gallery_photos", data.id, {
      isActive: data.isActive,
    });
    return { ok: true as const };
  });

/** Save a new photo order. */
export const reorderPhotos = createServerFn({ method: "POST" })
  .inputValidator((data: { ids: string[] }) => ({
    ids: (Array.isArray(data?.ids) ? data.ids : []).map((i) => clean(i, 40)).filter(Boolean).slice(0, 30),
  }))
  .handler(async ({ data }) => {
    const { requireStaff, logAudit } = await import("@/lib/staff.server");
    const actor = await requireStaff({ capability: "content" });
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let i = 0;
    for (const id of data.ids) {
      i += 1;
      const { error } = await supabaseAdmin.from("about_gallery_photos").update({ sort_order: i } as never).eq("id", id);
      if (error) return { ok: false as const, error: error.message };
    }
    await logAudit(supabaseAdmin as never, actor, "about_photo.reordered", "about_gallery_photos", null, { ids: data.ids });
    return { ok: true as const };
  });

/** Remove a photo for good. */
export const deletePhoto = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string }) => ({ id: clean(data?.id, 40) }))
  .handler(async ({ data }) => {
    const { requireStaff, logAudit } = await import("@/lib/staff.server");
    const actor = await requireStaff({ capability: "content" });
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("about_gallery_photos").delete().eq("id", data.id);
    if (error) return { ok: false as const, error: error.message };
    await logAudit(supabaseAdmin as never, actor, "about_photo.deleted", "about_gallery_photos", data.id, {});
    return { ok: true as const };
  });

/** Active photos for the public About page. */
export const publicAboutPhotos = createServerFn({ method: "GET" }).handler(async (): Promise<AboutPhoto[]> => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("about_gallery_photos")
    .select(SELECT)
    .eq("is_active", true)
    .order("sort_order")
    .limit(MAX_PHOTOS);
  return (data ?? []).map((r) => mapRow(r as Record<string, unknown>));
});
