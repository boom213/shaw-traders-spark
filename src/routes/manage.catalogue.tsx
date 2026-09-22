import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { manageProducts, saveProducts } from "@/lib/manage-data.functions";
import { categoriesQuery } from "@/lib/queries";
import type { Product } from "@/lib/catalog";
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
  const [q, setQ] = useState("");
  const [term, setTerm] = useState("");
  const [cat, setCat] = useState("");
  const [only, setOnly] = useState<"all" | "no-stock" | "no-price" | "no-photo">("all");
  const [page, setPage] = useState(0);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [defaultStock, setDefaultStock] = useState("10");
  const queryClient = useQueryClient();

  const { data: categories } = useQuery(categoriesQuery());
  const { data, isPending } = useQuery({
    queryKey: ["manage-products", term, cat, only, page],
    queryFn: () => manageProducts({ data: { q: term, category: cat, only, page } }),
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE));

  const save = useMutation({
    mutationFn: (updates: { id: string; price?: number | null; mrp?: number | null; stock?: number; brand?: string | null; image?: string }[]) =>
      saveProducts({ data: { updates } }),
    onSuccess: (res) => {
      setDrafts({});
      void queryClient.invalidateQueries({ queryKey: ["manage-products"] });
      void queryClient.invalidateQueries({ queryKey: ["manage-stats"] });
      toast.success(`Saved ${res.saved} product${res.saved === 1 ? "" : "s"}`);
    },
    onError: () => toast.error("Could not save your changes"),
  });

  const setDraft = (id: string, patch: Partial<Draft>, product: Product) =>
    setDrafts((d) => ({ ...d, [id]: { ...(d[id] ?? draftOf(product)), ...patch } }));

  const num = (v: string) => (v.trim() === "" ? null : Number(v));

  const saveAll = () => {
    const entries = Object.entries(drafts);
    if (entries.length === 0) return toast.info("Nothing changed yet");
    save.mutate(
      entries.map(([id, d]) => ({
        id,
        price: num(d.price),
        mrp: num(d.mrp),
        stock: Number(d.stock.trim() === "" ? 0 : d.stock),
        brand: d.brand.trim() || null,
        image: d.image.trim(),
      })),
    );
  };

  const fillStock = () => {
    const n = Number(defaultStock);
    if (!Number.isFinite(n) || n < 0) return toast.error("Enter a valid stock number");
    const targets = items.filter((p) => !p.stock);
    if (targets.length === 0) return toast.info("Every shown product already has stock");
    setDrafts((d) => {
      const next = { ...d };
      for (const p of targets) next[p.id] = { ...(next[p.id] ?? draftOf(p)), stock: String(n) };
      return next;
    });
    toast.success(`Stock ${n} filled in on ${targets.length} products — press Save changes`);
  };

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1.5">
            <Label htmlFor="q">Search</Label>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setTerm(q.trim());
                setPage(0);
              }}
            >
              <Input id="q" placeholder="Name, code, model" value={q} onChange={(e) => setQ(e.target.value)} />
            </form>
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
              {(categories ?? []).map((c) => (
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
          {total} products match. Products without their own photo use a general category photo on the shop — paste a photo link to replace it.
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
            {isPending && (
              <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">Loading products…</td></tr>
            )}
            {!isPending && items.map((p) => {
              const d = drafts[p.id] ?? draftOf(p);
              return (
                <tr key={p.id} className="border-t border-border align-middle">
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      <img src={imageFor(p)} alt={p.name} loading="lazy" width={44} height={44} className="size-11 shrink-0 rounded-lg object-cover" />
                      <div className="min-w-0">
                        <p className="line-clamp-2 font-medium">{p.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {p.sku} · {p.category}
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
            {!isPending && items.length === 0 && (
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
        <Button disabled={save.isPending} onClick={saveAll}>Save changes ({Object.keys(drafts).length})</Button>
      </div>
    </div>
  );
}
