import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { Camera, ChevronLeft, ChevronRight, GripVertical, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { catalogueList, createCatalogueProduct, quickSaveProduct, setProductImages, type CatalogueRow } from "@/lib/catalogue-admin.functions";
import { uploadProductPhoto } from "@/lib/photo-upload";
import { categoriesQuery } from "@/lib/queries";
import { placeholderFor } from "@/lib/placeholders";
import { STATUS_CHIP, isProductStatus, type ProductStatus } from "@/lib/ordering";

export const Route = createFileRoute("/manage/catalogue")({
  head: () => ({
    meta: [
      { title: "Products & Stock — Shaw Traders EV Manager" },
      { name: "description", content: "Manage product categories, catalogue visibility, prices, stock and product photos." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Products & Stock — Shaw Traders EV Manager" },
      { property: "og:description", content: "Manage product categories, catalogue visibility, prices, stock and product photos." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CataloguePage,
});

const FILTERS = [
  { value: "all", label: "Everything" },
  { value: "no-price", label: "Needs price" },
  { value: "no-photo", label: "Needs photo" },
  { value: "low-stock", label: "Low stock" },
  { value: "no-stock", label: "Out of stock" },
  { value: "visible", label: "Visible" },
  { value: "draft", label: "Draft" },
  { value: "hidden", label: "Hidden" },
  { value: "no-rack", label: "No shelf location" },
] as const;
const PAGE_SIZES = [10, 20, 50, 100] as const;

function CataloguePage() {
  const { staff } = Route.useRouteContext();
  const [q, setQ] = useState("");
  const [term, setTerm] = useState("");
  const [cat, setCat] = useState("");
  const [filter, setFilter] = useState<string>("all");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState<number>(20);

  const { data: categories } = useQuery(categoriesQuery());
  const { data, isPending } = useQuery({
    queryKey: ["catalogue-admin", term, cat, filter, page, pageSize],
    queryFn: () => catalogueList({ data: { q: term, category: cat, filter, page, pageSize } }),
    placeholderData: (previous) => previous,
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : page * pageSize + 1;
  const to = Math.min(total, (page + 1) * pageSize);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-card)]">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div><h2 className="font-display text-lg font-bold">Products & stock</h2><p className="text-sm text-muted-foreground">Products are assigned to the same categories shown on the homepage.</p></div>
          {staff.role === "super_admin" && <AddProductDialog categories={categories ?? []} />}
        </div>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            setTerm(q.trim());
            setPage(0);
          }}
        >
          <Input placeholder="Search name, code, brand or shelf" value={q} onChange={(e) => setQ(e.target.value)} />
          <Button type="submit" variant="outline">Find</Button>
        </form>

        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {FILTERS.map((f) => (
            <Button
              type="button"
              size="sm"
              variant={filter === f.value ? "default" : "outline"}
              key={f.value}
              onClick={() => { setFilter(f.value); setPage(0); }}
              className="shrink-0 rounded-full"
            >
              {f.label}
            </Button>
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

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">{total} products match. Changes save as soon as you tap Save on a card.</p>
          <label className="flex items-center gap-2 text-xs font-medium">Rows per page
            <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(0); }} className="h-9 rounded-md border border-input bg-background px-2 text-sm">
              {PAGE_SIZES.map((size) => <option key={size} value={size}>{size}</option>)}
            </select>
          </label>
        </div>
      </div>

      {isPending && [0, 1, 2].map((i) => <div key={i} className="h-56 animate-pulse rounded-2xl bg-muted" />)}

      {!isPending && items.length === 0 && (
        <p className="rounded-2xl border border-dashed border-border bg-surface p-8 text-center text-sm text-muted-foreground">
          Nothing matches these filters.
        </p>
      )}

      {items.map((p) => <ProductCard key={p.id} product={p} />)}

      <div className="sticky bottom-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-3 shadow-[var(--shadow-card)]">
        <span className="text-sm text-muted-foreground">Showing {from}–{to} of {total}</span>
        <div className="flex items-center gap-2">
          <Button aria-label="Previous page" variant="outline" size="icon" disabled={page === 0 || isPending} onClick={() => setPage((n) => Math.max(0, n - 1))}><ChevronLeft className="size-4" /></Button>
          <span className="min-w-24 text-center text-sm">Page {page + 1} of {pages}</span>
          <Button aria-label="Next page" variant="outline" size="icon" disabled={page + 1 >= pages || isPending} onClick={() => setPage((n) => Math.min(pages - 1, n + 1))}><ChevronRight className="size-4" /></Button>
        </div>
      </div>
    </div>
  );
}

type CategoryOption = { slug: string; name: string };

function AddProductDialog({ categories }: { categories: CategoryOption[] }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", sku: "", category: "", brand: "", price: "", mrp: "", stock: "0", description: "", status: "draft" });
  const set = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }));
  const optionalNumber = (value: string) => value.trim() === "" ? null : Number(value);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    const result = await createCatalogueProduct({ data: {
      name: form.name,
      sku: form.sku,
      category: form.category,
      brand: form.brand,
      price: optionalNumber(form.price),
      mrp: optionalNumber(form.mrp),
      stock: Number(form.stock || 0),
      description: form.description,
      status: form.status,
    } });
    setSaving(false);
    if (!result.ok) return toast.error(result.error);
    toast.success("Product added");
    setOpen(false);
    setForm({ name: "", sku: "", category: "", brand: "", price: "", mrp: "", stock: "0", description: "", status: "draft" });
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["catalogue-admin"] }),
      queryClient.invalidateQueries({ queryKey: ["categories"] }),
      queryClient.invalidateQueries({ queryKey: ["home"] }),
      queryClient.invalidateQueries({ queryKey: ["products"] }),
    ]);
  };
  return <Dialog open={open} onOpenChange={setOpen}>
    <DialogTrigger asChild><Button><Plus className="size-4" /> Add product</Button></DialogTrigger>
    <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
      <DialogHeader><DialogTitle>Add product</DialogTitle><DialogDescription>Choose a homepage category. New products start as drafts unless you select Visible.</DialogDescription></DialogHeader>
      <form className="grid gap-4 sm:grid-cols-2" onSubmit={(event) => void submit(event)}>
        <Cell label="Product name"><Input required minLength={2} value={form.name} onChange={(e) => set("name", e.target.value)} /></Cell>
        <Cell label="Product code (SKU)"><Input required minLength={2} value={form.sku} onChange={(e) => set("sku", e.target.value.toUpperCase())} /></Cell>
        <Cell label="Homepage category"><select required value={form.category} onChange={(e) => set("category", e.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="">Choose category</option>{categories.map((category) => <option key={category.slug} value={category.slug}>{category.name}</option>)}</select></Cell>
        <Cell label="Brand"><Input value={form.brand} onChange={(e) => set("brand", e.target.value)} /></Cell>
        <Cell label="Price ₹"><Input min="0" step="0.01" type="number" value={form.price} onChange={(e) => set("price", e.target.value)} /></Cell>
        <Cell label="MRP ₹"><Input min="0" step="0.01" type="number" value={form.mrp} onChange={(e) => set("mrp", e.target.value)} /></Cell>
        <Cell label="Opening stock"><Input required min="0" step="1" type="number" value={form.stock} onChange={(e) => set("stock", e.target.value)} /></Cell>
        <Cell label="Visibility"><select value={form.status} onChange={(e) => set("status", e.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="draft">Draft</option><option value="visible">Visible on storefront</option><option value="hidden">Hidden</option></select></Cell>
        <div className="grid gap-1 sm:col-span-2"><Label>Description</Label><Textarea rows={4} value={form.description} onChange={(e) => set("description", e.target.value)} /></div>
        <div className="flex justify-end gap-2 sm:col-span-2"><Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button type="submit" disabled={saving || categories.length === 0}>{saving ? "Adding…" : "Add product"}</Button></div>
      </form>
    </DialogContent>
  </Dialog>;
}

function ProductCard({ product }: { product: CatalogueRow }) {
  const queryClient = useQueryClient();
  const [price, setPrice] = useState(product.price === null ? "" : String(product.price));
  const [mrp, setMrp] = useState(product.mrp === null ? "" : String(product.mrp));
  const [stock, setStock] = useState(String(product.stock));
  const [threshold, setThreshold] = useState(product.reorderThreshold === null ? "" : String(product.reorderThreshold));
  const [rack, setRack] = useState(product.rackLocation ?? "");
  const [status, setStatus] = useState<ProductStatus>(isProductStatus(product.status) ? product.status : "visible");
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
        rackLocation: rack,
        status,
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
          <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS_CHIP[status].className}`}>
            {STATUS_CHIP[status].label}
          </span>
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
        <Cell label="Shelf"><Input placeholder="A-3 / Rack 2 / Bin 14" value={rack} onChange={(e) => setRack(e.target.value)} /></Cell>
        <Cell label="Shown as">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as ProductStatus)}
            className="h-10 w-full rounded-md border border-input bg-background px-2 text-sm"
          >
            <option value="visible">Visible</option>
            <option value="draft">Draft</option>
            <option value="hidden">Hidden</option>
          </select>
        </Cell>
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
