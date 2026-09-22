import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, ImagePlus, Loader2, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { uploadHeroPhoto } from "@/lib/photo-upload";
import { deleteSlide, listSlides, reorderSlides, saveSlide, toggleSlide, type AdminSlide } from "@/lib/hero-admin.functions";

export const Route = createFileRoute("/manage/home")({
  ssr: false,
  component: HomeBanners,
});

function HomeBanners() {
  const qc = useQueryClient();
  const { data, isPending } = useQuery({ queryKey: ["hero-slides"], queryFn: () => listSlides() });
  const slides = data ?? [];
  const refresh = () => qc.invalidateQueries({ queryKey: ["hero-slides"] });

  const save = useMutation({
    mutationFn: (slide: AdminSlide) =>
      saveSlide({
        data: {
          ...(slide.id ? { id: slide.id } : {}),
          ...(slide.imageUrl ? { imageUrl: slide.imageUrl } : {}),
          heading: slide.heading,
          ...(slide.subline ? { subline: slide.subline } : {}),
          ...(slide.buttonLabel ? { buttonLabel: slide.buttonLabel } : {}),
          ...(slide.buttonHref ? { buttonHref: slide.buttonHref } : {}),
          isActive: slide.isActive,
        },
      }),
    onSuccess: (res) => {
      if (!res.ok) return toast.error(res.error);
      toast.success("Banner saved");
      void refresh();
    },
  });

  const move = async (index: number, dir: -1 | 1) => {
    const next = [...slides];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    const a = next[index]!;
    next[index] = next[target]!;
    next[target] = a;
    const res = await reorderSlides({ data: { ids: next.map((s) => s.id) } });
    if (!res.ok) return toast.error(res.error);
    void refresh();
  };

  const addBlank = () =>
    save.mutate({
      id: "",
      imageUrl: null,
      heading: "New banner",
      subline: null,
      buttonLabel: "Shop Products",
      buttonHref: "/shop",
      sortOrder: slides.length + 1,
      isActive: false,
    });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-bold">Home banners</h2>
          <p className="text-sm text-muted-foreground">Up to 5 sliding banners at the top of the home page.</p>
        </div>
        <Button onClick={addBlank} disabled={slides.length >= 5 || save.isPending}>
          <Plus className="size-4" /> Add banner
        </Button>
      </div>

      {isPending && <p className="text-sm text-muted-foreground">Loading banners…</p>}

      {slides.map((slide, i) => (
        <SlideCard
          key={slide.id}
          slide={slide}
          index={i}
          total={slides.length}
          onMove={move}
          onSave={(s) => save.mutate(s)}
          onRefresh={refresh}
        />
      ))}

      {!isPending && slides.length === 0 && (
        <p className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          No banners yet. Add one to start.
        </p>
      )}
    </div>
  );
}

function SlideCard({
  slide,
  index,
  total,
  onMove,
  onSave,
  onRefresh,
}: {
  slide: AdminSlide;
  index: number;
  total: number;
  onMove: (i: number, dir: -1 | 1) => void;
  onSave: (s: AdminSlide) => void;
  onRefresh: () => void;
}) {
  const [draft, setDraft] = useState<AdminSlide>(slide);
  const [busy, setBusy] = useState(false);
  const set = (patch: Partial<AdminSlide>) => setDraft((d) => ({ ...d, ...patch }));

  const pickPhoto = async (file?: File) => {
    if (!file) return;
    setBusy(true);
    try {
      const url = await uploadHeroPhoto(file);
      set({ imageUrl: url });
      onSave({ ...draft, imageUrl: url });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Photo upload failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-3xl border border-border bg-card p-4 shadow-[var(--shadow-card)]">
      <div className="grid gap-4 sm:grid-cols-[200px_1fr]">
        <div>
          <div className="relative aspect-[16/9] w-full overflow-hidden rounded-2xl border border-border bg-surface">
            {draft.imageUrl ? (
              <img
                src={draft.imageUrl}
                alt={draft.heading}
                width={320}
                height={180}
                loading="lazy"
                className="absolute inset-0 size-full object-cover"
              />
            ) : (
              <span className="absolute inset-0 grid place-items-center text-xs text-muted-foreground">Default photo</span>
            )}
          </div>
          <label className="mt-2 flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-border py-2 text-sm font-medium">
            {busy ? <Loader2 className="size-4 animate-spin" /> : <ImagePlus className="size-4" />}
            Change photo
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(e) => void pickPhoto(e.target.files?.[0])}
            />
          </label>
        </div>

        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor={`h-${slide.id}`}>Heading</Label>
            <Input id={`h-${slide.id}`} value={draft.heading} maxLength={90} onChange={(e) => set({ heading: e.target.value })} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor={`s-${slide.id}`}>One line below</Label>
            <Input
              id={`s-${slide.id}`}
              value={draft.subline ?? ""}
              maxLength={160}
              onChange={(e) => set({ subline: e.target.value })}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor={`b-${slide.id}`}>Button text</Label>
              <Input
                id={`b-${slide.id}`}
                value={draft.buttonLabel ?? ""}
                maxLength={30}
                onChange={(e) => set({ buttonLabel: e.target.value })}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor={`l-${slide.id}`}>Button link</Label>
              <Input
                id={`l-${slide.id}`}
                value={draft.buttonHref ?? ""}
                placeholder="/shop"
                onChange={(e) => set({ buttonHref: e.target.value })}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-sm font-medium">
              <Switch
                checked={draft.isActive}
                onCheckedChange={async (v) => {
                  set({ isActive: v });
                  const res = await toggleSlide({ data: { id: slide.id, isActive: v } });
                  if (!res.ok) toast.error(res.error);
                  else onRefresh();
                }}
                aria-label="Show this banner on the home page"
              />
              {draft.isActive ? "Showing" : "Switched off"}
            </label>

            <div className="ml-auto flex items-center gap-2">
              <Button variant="outline" size="icon" aria-label="Move up" disabled={index === 0} onClick={() => onMove(index, -1)}>
                <ArrowUp className="size-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                aria-label="Move down"
                disabled={index === total - 1}
                onClick={() => onMove(index, 1)}
              >
                <ArrowDown className="size-4" />
              </Button>
              <Button onClick={() => onSave(draft)}>Save</Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Delete banner"
                onClick={async () => {
                  if (!window.confirm("Delete this banner?")) return;
                  const res = await deleteSlide({ data: { id: slide.id } });
                  if (!res.ok) toast.error(res.error);
                  else onRefresh();
                }}
              >
                <Trash2 className="size-4 text-destructive" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
