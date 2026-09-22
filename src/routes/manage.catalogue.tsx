import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { Camera, GripVertical, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { catalogueList, quickSaveProduct, setProductImages, type CatalogueRow } from "@/lib/catalogue-admin.functions";
import { uploadProductPhoto } from "@/lib/photo-upload";
import { categoriesQuery } from "@/lib/queries";
import { placeholderFor } from "@/lib/placeholders";

export const Route = createFileRoute("/manage/catalogue")({
  component: CataloguePage,
});

const FILTERS = [
  { value: "all", label: "Everything" },
  { value: "no-price", label: "Needs price" },
  { value: "no-photo", label: "Needs photo" },
  { value: "low-stock", label: "Low stock" },
  { value: "no-stock", label: "Out of stock" },
] as const;

function CataloguePage() {
  const [q, setQ] = useState("");
  const [term, setTerm] = useState("");
  const [cat, setCat] = useState("");
  const [filter, setFilter] = useState<string>("all");
  const [page, setPage] = useState(0);

  const { data: categories } = useQuery(categoriesQuery());
  const { data, isPending } = useQuery({
    queryKey: ["catalogue-admin", term, cat, filter, page],
    queryFn: () => catalogueList({ data: { q: term, category: cat, filter, page } }),
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / 30));

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-card)]">
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            setTerm(q.trim());
            setPage(0);
          }}
        >
          <Input placeholder="Search name, code or brand" value={q} onChange={(e) => setQ(e.target.value)} />
          <Button type="submit" variant="outline">Find</Button>
        </form>

        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => { setFilter(f.value); setPage(0); }}
              className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold ${
                filter === f.value ? "border-primary bg-primary text-primary-foreground" : "border-border"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <select
          value={cat}
          onChange={(e) => { setCat(e.target.value); setPage(0); }}
          className="mt-3 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="">All categories</option>
          {(categories ?? []).map((c) => (
            <option key={c.slug} value={c.slug}>{c.name}</option>
          ))}
        </select>

        <p className="mt-3 text-xs text-muted-foreground">{total} products match. Changes save as soon as you tap Save on a card.</p>
      </div>

      {isPending && [0, 1, 2].map((i) => <div key={i} className="h-56 animate-pulse rounded-2xl bg-muted" />)}

      {!isPending && items.length === 0 && (
        <p className="rounded-2xl border border-dashed border-border bg-surface p-8 text-center text-sm text-muted-foreground">
          Nothing matches these filters.
        </p>
      )}

      {items.map((p) => <ProductCard key={p.id} product={p} />)}

      <div className="sticky bottom-3 flex items-center justify-between gap-2 rounded-2xl border border-border bg-card p-3 shadow-[var(--shadow-card)]">
        <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((n) => n - 1)}>Back</Button>
        <span className="text-sm text-muted-foreground">Page {page + 1} of {pages}</span>
        <Button variant="outline" size="sm" disabled={page + 1 >= pages} onClick={() => setPage((n) => n + 1)}>Next</Button>
      </div>
    </div>
  );
}

function ProductCard({ product }: { product: CatalogueRow }) {
  const queryClient = useQueryClient();
  const [price, setPrice] = useState(product.price === null ? "" : String(product.price));
  const [mrp, setMrp] = useState(product.mrp === null ? "" : String(product.mrp));
  const [stock, setStock] = useState(String(product.stock));
  const [threshold, setThreshold] = useState(product.reorderThreshold === null ? "" : String(product.reorderThreshold));
  const [saving, setSaving] = useState(false);

  const num = (v: string) => (v.trim() === "" ? null : Number(v));
  const low = product.stock <= (product.reorderThreshold ?? 3);

  const save = async () => {
    setSaving(true);
    const res = await quickSaveProduct({
      data: {
        id: product.id,
        price: num(price),
        mrp: num(mrp),
        stock: Number(stock || 0),
        reorderThreshold: num(threshold),
      },
    });
    setSaving(false);
    if (!res.ok) return toast.error(res.error ?? "Could not save");
    toast.success("Saved");
    void queryClient.invalidateQueries({ queryKey: ["catalogue-admin"] });
    void queryClient.invalidateQueries({ queryKey: ["manage-dashboard"] });
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-card)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold leading-snug">{product.name}</p>
          <p className="text-xs text-muted-foreground">
            {product.sku} · {product.categoryName}
            {product.price === null && " · no price yet"}
            {low && ` · only ${product.stock} left`}
          </p>
        </div>
      </div>

      <Photos product={product} />

      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Cell label="Price ₹"><Input inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} /></Cell>
        <Cell label="MRP ₹"><Input inputMode="decimal" value={mrp} onChange={(e) => setMrp(e.target.value)} /></Cell>
        <Cell label="Stock"><Input inputMode="numeric" value={stock} onChange={(e) => setStock(e.target.value)} /></Cell>
        <Cell label="Warn at"><Input inputMode="numeric" placeholder="3" value={threshold} onChange={(e) => setThreshold(e.target.value)} /></Cell>
      </div>

      <Button className="mt-3 w-full sm:w-auto" disabled={saving} onClick={() => void save()}>
        {saving ? "Saving…" : "Save"}
      </Button>
    </div>
  );
}

function Cell({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1">
      <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function Photos({ product }: { product: CatalogueRow }) {
  const queryClient = useQueryClient();
  const [urls, setUrls] = useState<string[]>(product.images);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState<number | null>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  const persist = async (next: string[]) => {
    setUrls(next);
    const res = await setProductImages({ data: { id: product.id, urls: next } });
    if (!res.ok) return toast.error(res.error ?? "Could not save the photos");
    void queryClient.invalidateQueries({ queryKey: ["catalogue-admin"] });
    void queryClient.invalidateQueries({ queryKey: ["manage-dashboard"] });
  };

  const addFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setBusy(true);
    const added: string[] = [];
    for (const file of Array.from(files).slice(0, 6)) {
      try {
        added.push(await uploadProductPhoto(product.id, file));
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "One photo could not be uploaded");
      }
    }
    if (added.length > 0) {
      await persist([...urls, ...added].slice(0, 8));
      toast.success(`${added.length} photo${added.length === 1 ? "" : "s"} added`);
    }
    setBusy(false);
  };

  const move = (from: number, to: number) => {
    if (from === to) return;
    const next = [...urls];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item!);
    void persist(next);
  };

  return (
    <div className="mt-3">
      <div className="flex flex-wrap gap-2">
        {urls.length === 0 && (
          <img src={placeholderFor(product.category)} alt="" className="size-20 rounded-xl object-cover opacity-60" />
        )}
        {urls.map((u, i) => (
          <div
            key={u}
            draggable
            onDragStart={() => setDragging(i)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => { if (dragging !== null) move(dragging, i); setDragging(null); }}
            className="relative size-20 overflow-hidden rounded-xl border border-border"
          >
            <img src={u} alt="" className="size-full object-cover" />
            {i === 0 && <span className="absolute left-1 top-1 rounded bg-primary px-1 text-[10px] font-semibold text-primary-foreground">Main</span>}
            <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-black/45 px-1 py-0.5">
              <button aria-label="Move left" disabled={i === 0} onClick={() => move(i, i - 1)} className="text-white disabled:opacity-30">
                <GripVertical className="size-3.5 rotate-90" />
              </button>
              <button aria-label="Remove photo" onClick={() => void persist(urls.filter((_, n) => n !== i))} className="text-white">
                <Trash2 className="size-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-2 flex flex-wrap gap-2">
        <input ref={cameraRef} type="file" accept="image/*" capture="environment" hidden onChange={(e) => void addFiles(e.target.files)} />
        <input ref={galleryRef} type="file" accept="image/*" multiple hidden onChange={(e) => void addFiles(e.target.files)} />
        <Button size="sm" variant="outline" disabled={busy} onClick={() => cameraRef.current?.click()}>
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Camera className="size-4" />} Take photo
        </Button>
        <Button size="sm" variant="outline" disabled={busy} onClick={() => galleryRef.current?.click()}>
          Choose from gallery
        </Button>
      </div>
      <p className="mt-1 text-[11px] text-muted-foreground">
        Photos are shrunk automatically. Drag a photo, or use the arrow, to change which one shows first.
      </p>
    </div>
  );
}
