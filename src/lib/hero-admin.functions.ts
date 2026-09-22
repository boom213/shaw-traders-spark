import { createServerFn } from "@tanstack/react-start";

export type AdminSlide = {
  id: string;
  imageUrl: string | null;
  heading: string;
  subline: string | null;
  buttonLabel: string | null;
  buttonHref: string | null;
  sortOrder: number;
  isActive: boolean;
};

const clean = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);
const orNull = (v: unknown, max: number) => (clean(v, max) ? clean(v, max) : null);

const SELECT = "id, image_url, heading, subline, button_label, button_href, sort_order, is_active";

const mapRow = (r: Record<string, unknown>): AdminSlide => ({
  id: String(r['id']),
  imageUrl: (r['image_url'] as string) ?? null,
  heading: String(r['heading'] ?? ""),
  subline: (r['subline'] as string) ?? null,
  buttonLabel: (r['button_label'] as string) ?? null,
  buttonHref: (r['button_href'] as string) ?? null,
  sortOrder: Number(r['sort_order'] ?? 0),
  isActive: Boolean(r['is_active']),
});

/** Every home banner, in display order — including the switched-off ones. */
export const listSlides = createServerFn({ method: "POST" }).handler(async (): Promise<AdminSlide[]> => {
  const { requireStaff } = await import("@/lib/staff.server");
  await requireStaff();
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin.from("hero_slides").select(SELECT).order("sort_order").limit(50);
  return (data ?? []).map((r) => mapRow(r as Record<string, unknown>));
});

/** Create or update one banner. */
export const saveSlide = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      id?: string;
      imageUrl?: string;
      heading: string;
      subline?: string;
      buttonLabel?: string;
      buttonHref?: string;
      isActive?: boolean;
    }) => ({
      id: clean(data?.id, 40),
      imageUrl: orNull(data?.imageUrl, 400),
      heading: clean(data?.heading, 90),
      subline: orNull(data?.subline, 160),
      buttonLabel: orNull(data?.buttonLabel, 30),
      buttonHref: orNull(data?.buttonHref, 300),
      isActive: data?.isActive !== false,
    }),
  )
  .handler(async ({ data }) => {
    const { requireStaff, logAudit } = await import("@/lib/staff.server");
    const actor = await requireStaff();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (data.heading.length < 3) return { ok: false as const, error: "Give the banner a heading." };

    const row = {
      image_url: data.imageUrl,
      heading: data.heading,
      subline: data.subline,
      button_label: data.buttonLabel,
      button_href: data.buttonHref,
      is_active: data.isActive,
    };

    if (data.id) {
      const { error } = await supabaseAdmin.from("hero_slides").update(row as never).eq("id", data.id);
      if (error) return { ok: false as const, error: error.message };
      await logAudit(supabaseAdmin as never, actor, "hero.updated", "hero_slides", data.id, row);
      return { ok: true as const, id: data.id };
    }

    const { count } = await supabaseAdmin.from("hero_slides").select("id", { count: "exact", head: true });
    if ((count ?? 0) >= 5) return { ok: false as const, error: "You can keep up to 5 banners. Delete one first." };

    const { data: made, error } = await supabaseAdmin
      .from("hero_slides")
      .insert({ ...row, sort_order: (count ?? 0) + 1 } as never)
      .select("id")
      .maybeSingle();
    if (error) return { ok: false as const, error: error.message };
    await logAudit(supabaseAdmin as never, actor, "hero.created", "hero_slides", String(made?.id ?? ""), row);
    return { ok: true as const, id: String(made?.id ?? "") };
  });

/** Turn one banner on or off without deleting it. */
export const toggleSlide = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string; isActive: boolean }) => ({
    id: clean(data?.id, 40),
    isActive: Boolean(data?.isActive),
  }))
  .handler(async ({ data }) => {
    const { requireStaff, logAudit } = await import("@/lib/staff.server");
    const actor = await requireStaff();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("hero_slides").update({ is_active: data.isActive } as never).eq("id", data.id);
    if (error) return { ok: false as const, error: error.message };
    await logAudit(supabaseAdmin as never, actor, "hero.toggled", "hero_slides", data.id, { isActive: data.isActive });
    return { ok: true as const };
  });

/** Save a new banner order. */
export const reorderSlides = createServerFn({ method: "POST" })
  .inputValidator((data: { ids: string[] }) => ({
    ids: (Array.isArray(data?.ids) ? data.ids : []).map((i) => clean(i, 40)).filter(Boolean).slice(0, 20),
  }))
  .handler(async ({ data }) => {
    const { requireStaff, logAudit } = await import("@/lib/staff.server");
    const actor = await requireStaff();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let i = 0;
    for (const id of data.ids) {
      i += 1;
      const { error } = await supabaseAdmin.from("hero_slides").update({ sort_order: i } as never).eq("id", id);
      if (error) return { ok: false as const, error: error.message };
    }
    await logAudit(supabaseAdmin as never, actor, "hero.reordered", "hero_slides", null, { ids: data.ids });
    return { ok: true as const };
  });

/** Remove a banner for good. */
export const deleteSlide = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string }) => ({ id: clean(data?.id, 40) }))
  .handler(async ({ data }) => {
    const { requireStaff, logAudit } = await import("@/lib/staff.server");
    const actor = await requireStaff();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("hero_slides").delete().eq("id", data.id);
    if (error) return { ok: false as const, error: error.message };
    await logAudit(supabaseAdmin as never, actor, "hero.deleted", "hero_slides", data.id, {});
    return { ok: true as const };
  });
