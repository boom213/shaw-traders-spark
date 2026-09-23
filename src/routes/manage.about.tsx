import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, ImagePlus, Loader2, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { uploadAboutPhoto } from "@/lib/photo-upload";
import {
  deletePhoto,
  listPhotos,
  reorderPhotos,
  savePhoto,
  togglePhoto,
  type AboutPhoto,
} from "@/lib/about-gallery-admin.functions";

export const Route = createFileRoute("/manage/about")({
  ssr: false,
  component: AboutGallery,
});

const MAX_PHOTOS = 12;

function AboutGallery() {
  const qc = useQueryClient();
  const { data, isPending } = useQuery({ queryKey: ["about-photos"], queryFn: () => listPhotos() });
  const photos = data ?? [];
  const refresh = () => qc.invalidateQueries({ queryKey: ["about-photos"] });
  const [adding, setAdding] = useState(false);

  const save = useMutation({
    mutationFn: (photo: AboutPhoto) =>
      savePhoto({
        data: {
          ...(photo.id ? { id: photo.id } : {}),
          ...(photo.imageUrl ? { imageUrl: photo.imageUrl } : {}),
          ...(photo.caption ? { caption: photo.caption } : {}),
          isActive: photo.isActive,
        },
      }),
    onSuccess: (res) => {
      if (!res.ok) return toast.error(res.error);
      toast.success("Photo saved");
      void refresh();
    },
  });

  const move = async (index: number, dir: -1 | 1) => {
    const next = [...photos];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    const a = next[index]!;
    next[index] = next[target]!;
    next[target] = a;
    const res = await reorderPhotos({ data: { ids: next.map((p) => p.id) } });
    if (!res.ok) return toast.error(res.error);
    void refresh();
  };

  const addPhoto = async (file?: File) => {
    if (!file) return;
    setAdding(true);
    try {
      const url = await uploadAboutPhoto(file);
      save.mutate({ id: "", imageUrl: url, caption: null, sortOrder: photos.length + 1, isActive: true });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Photo upload failed");
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-bold">About gallery</h2>
          <p className="text-sm text-muted-foreground">Up to {MAX_PHOTOS} shop photos shown on the About page.</p>
        </div>
        <label
          className={`flex cursor-pointer items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground ${
            photos.length >= MAX_PHOTOS ? "pointer-events-none opacity-50" : ""
          }`}
        >
          {adding ? <Loader2 className="size-4 animate-spin" /> : <ImagePlus className="size-4" />}
          Add photo
          <input type="file" accept="image/*" className="sr-only" onChange={(e) => void addPhoto(e.target.files?.[0])} />
        </label>
      </div>

      {isPending && <p className="text-sm text-muted-foreground">Loading photos…</p>}

      {photos.map((photo, i) => (
        <PhotoCard
          key={photo.id}
          photo={photo}
          index={i}
          total={photos.length}
          onMove={move}
          onSave={(p) => save.mutate(p)}
          onRefresh={refresh}
        />
      ))}

      {!isPending && photos.length === 0 && (
        <p className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          No photos yet. Add one to start.
        </p>
      )}
    </div>
  );
}

function PhotoCard({
  photo,
  index,
  total,
  onMove,
  onSave,
  onRefresh,
}: {
  photo: AboutPhoto;
  index: number;
  total: number;
  onMove: (i: number, dir: -1 | 1) => void;
  onSave: (p: AboutPhoto) => void;
  onRefresh: () => void;
}) {
  const [draft, setDraft] = useState<AboutPhoto>(photo);
  const [busy, setBusy] = useState(false);

  const replacePhoto = async (file?: File) => {
    if (!file) return;
    setBusy(true);
    try {
      const url = await uploadAboutPhoto(file);
      setDraft((d) => ({ ...d, imageUrl: url }));
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
          <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl border border-border bg-surface">
            {draft.imageUrl ? (
              <img
                src={draft.imageUrl}
                alt={draft.caption ?? "Shop photo"}
                width={320}
                height={240}
                loading="lazy"
                className="absolute inset-0 size-full object-cover"
              />
            ) : (
              <span className="absolute inset-0 grid place-items-center text-xs text-muted-foreground">No photo</span>
            )}
          </div>
          <label className="mt-2 flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-border py-2 text-sm font-medium">
            {busy ? <Loader2 className="size-4 animate-spin" /> : <ImagePlus className="size-4" />}
            Change photo
            <input type="file" accept="image/*" className="sr-only" onChange={(e) => void replacePhoto(e.target.files?.[0])} />
          </label>
        </div>

        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor={`c-${photo.id}`}>Caption (optional)</Label>
            <Input
              id={`c-${photo.id}`}
              value={draft.caption ?? ""}
              maxLength={160}
              onChange={(e) => setDraft((d) => ({ ...d, caption: e.target.value }))}
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-sm font-medium">
              <Switch
                checked={draft.isActive}
                onCheckedChange={async (v) => {
                  setDraft((d) => ({ ...d, isActive: v }));
                  const res = await togglePhoto({ data: { id: photo.id, isActive: v } });
                  if (!res.ok) toast.error(res.error);
                  else onRefresh();
                }}
                aria-label="Show this photo on the About page"
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
                aria-label="Delete photo"
                onClick={async () => {
                  if (!window.confirm("Delete this photo?")) return;
                  const res = await deletePhoto({ data: { id: photo.id } });
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
