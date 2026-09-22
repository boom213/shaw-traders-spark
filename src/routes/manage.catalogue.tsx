import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useStore } from "@/hooks/useStore";
import { CATEGORIES, categoryBySlug, type Product } from "@/lib/catalog";
import { imageFor, isPlaceholder } from "@/lib/placeholders";

export const Route = createFileRoute("/manage/catalogue")({
  component: BulkCatalogue,
});

const PAGE = 40;

type Draft = { price: string; mrp: string; stock: string; image: string; brand: string };

const draftOf = (p: Product): Draft => ({
  price: p.price === undefined ? "" : String(p.price),
  mrp: p.mrp === undefined ? "" : String(p.mrp),
  stock: p.stock === undefined ? "" : String(p.stock),
  image: p.images[0] ?? "",
  brand: p.brand ?? "",
});

function BulkCatalogue() {
  const { state, update } = useStore();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const [only, setOnly] = useState<"all" | "no-stock" | "no-price" | "no-photo">("all");
  const [page, setPage] = useState(0);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [defaultStock, setDefaultStock] = useState("10");

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return state.products.filter((p) => {
      if (cat && p.category !== cat) return false;
      if (only === "no-stock" && p.stock !== undefined) return false;
      if (only === "no-price" && p.price !== undefined) return false;
      if (only === "no-photo" && p.images[0]) return false;
      if (!term) return true;
      return `${p.name} ${p.sku} ${p.brand ?? ""} ${p.model ?? ""}`.toLowerCase().includes(term);
    });
  }, [state.products, q, cat, only]);

  const pageItems = filtered.slice(page * PAGE, page * PAGE + PAGE);
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE));

  const setDraft = (id: string, patch: Partial<Draft>, product: Product) =>
    setDrafts((d) => ({ ...d, [id]: { ...(d[id] ?? draftOf(product)), ...patch } }));

  const num = (v: string) => (v.trim() === "" ? undefined : Number(v));

  const saveAll = () => {
    const entries = Object.entries(drafts);
    if (entries.length === 0) return toast.info("Nothing changed yet");
    update((s) => ({
      ...s,
      products: s.products.map((p) => {
        const d = drafts[p.id];
        if (!d) return p;
        return {
          ...p,
          price: num(d.price),
          mrp: num(d.mrp),
          stock: num(d.stock),
          brand: d.brand.trim() || undefined,
          images: d.image.trim() ? [d.image.trim(), ...p.images.slice(1)] : p.images.slice(1),
        };
      }),
    }));
    setDrafts({});
    toast.success(`Saved ${entries.length} product${entries.length > 1 ? "s" : ""}`);
  };

  const fillStock = () => {
    const n = Number(defaultStock);
    if (!Number.isFinite(n) || n < 0) return toast.error("Enter a valid stock number");
    const ids = new Set(filtered.filter((p) => p.stock === undefined).map((p) => p.id));
    if (ids.size === 0) return toast.info("Every shown product already has stock");
    update((s) => ({ ...s, products: s.products.map((p) => (ids.has(p.id) ? { ...p, stock: n } : p)) }));
    toast.success(`Set stock ${n} on ${ids.size} products — correct any of them below`);
  };

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1.5">
            <Label htmlFor="q">Search</Label>
            <Input id="q" placeholder="Name, code, model" value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cat">Category</Label>
            <select
              id="cat"
              value={cat}
              onChange={(e) => { setCat(e.target.value); setPage(0); }}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">All categories</option>
              {CATEGORIES.map((c) => (
                <option key={c.slug} value={c.slug}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="only">Show</Label>
            <select
              id="only"
              value={only}
              onChange={(e) => { setOnly(e.target.value as typeof only); setPage(0); }}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="all">All products</option>
              <option value="no-stock">Missing stock</option>
              <option value="no-price">Missing price</option>
              <option value="no-photo">Missing photo</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ds">Fill missing stock with</Label>
            <div className="flex gap-2">
              <Input id="ds" value={defaultStock} onChange={(e) => setDefaultStock(e.target.value)} className="w-24" />
              <Button variant="outline" onClick={fillStock}>Apply to shown</Button>
            </div>
          </div>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          {filtered.length} products shown. Products without their own photo use a general category photo on the shop — paste a photo link to replace it.
        </p>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-[var(--shadow-card)]">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="bg-surface text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="p-3">Product</th>
              <th className="p-3 w-28">Brand</th>
              <th className="p-3 w-24">Price ₹</th>
              <th className="p-3 w-24">MRP ₹</th>
              <th className="p-3 w-20">Stock</th>
              <th className="p-3 w-64">Photo link</th>
            </tr>
          </thead>
          <tbody>
            {pageItems.map((p) => {
              const d = drafts[p.id] ?? draftOf(p);
              return (
                <tr key={p.id} className="border-t border-border align-middle">
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      <img src={imageFor(p)} alt={p.name} loading="lazy" width={44} height={44} className="size-11 shrink-0 rounded-lg object-cover" />
                      <div className="min-w-0">
                        <p className="line-clamp-2 font-medium">{p.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {p.sku} · {categoryBySlug(p.category)?.name ?? p.category}
                          {isPlaceholder(p) && " · general photo"}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="p-3"><Input value={d.brand} onChange={(e) => setDraft(p.id, { brand: e.target.value }, p)} /></td>
                  <td className="p-3"><Input inputMode="numeric" value={d.price} onChange={(e) => setDraft(p.id, { price: e.target.value }, p)} /></td>
                  <td className="p-3"><Input inputMode="numeric" value={d.mrp} onChange={(e) => setDraft(p.id, { mrp: e.target.value }, p)} /></td>
                  <td className="p-3"><Input inputMode="numeric" value={d.stock} onChange={(e) => setDraft(p.id, { stock: e.target.value }, p)} /></td>
                  <td className="p-3"><Input placeholder="https://…" value={d.image} onChange={(e) => setDraft(p.id, { image: e.target.value }, p)} /></td>
                </tr>
              );
            })}
            {pageItems.length === 0 && (
              <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">No products match these filters.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="sticky bottom-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-3 shadow-[var(--shadow-card)]">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((n) => n - 1)}>Previous</Button>
          <span className="text-sm text-muted-foreground">Page {page + 1} of {pages}</span>
          <Button variant="outline" size="sm" disabled={page + 1 >= pages} onClick={() => setPage((n) => n + 1)}>Next</Button>
        </div>
        <Button onClick={saveAll}>Save changes ({Object.keys(drafts).length})</Button>
      </div>
    </div>
  );
}
