import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { SlidersHorizontal } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { EmptyCatalogue, SectionHeading } from "@/components/site/Empty";
import { ProductCard } from "@/components/site/ProductCard";
import { SearchBox } from "@/components/site/SearchBox";
import { useStore } from "@/hooks/useStore";
import { CATEGORIES, type Product } from "@/lib/catalog";

type ShopSearch = {
  q?: string;
  category?: string;
  brand?: string;
  min?: number;
  max?: number;
  sort?: string;
  inStock?: boolean;
  rating?: number;
  voltage?: string;
  model?: string;
};

export const Route = createFileRoute("/shop")({
  validateSearch: (search: Record<string, unknown>): ShopSearch => ({
    q: typeof search.q === "string" ? search.q : undefined,
    category: typeof search.category === "string" ? search.category : undefined,
    brand: typeof search.brand === "string" ? search.brand : undefined,
    min: search.min ? Number(search.min) : undefined,
    max: search.max ? Number(search.max) : undefined,
    sort: typeof search.sort === "string" ? search.sort : undefined,
    inStock: search.inStock === true || search.inStock === "true",
    rating: search.rating ? Number(search.rating) : undefined,
    voltage: typeof search.voltage === "string" ? search.voltage : undefined,
    model: typeof search.model === "string" ? search.model : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Shop EV Parts & Accessories — Shaw Traders EV" },
      { name: "description", content: "Search and filter EV batteries, chargers, motors, controllers, body parts and accessories by brand, voltage, capacity and price." },
      { property: "og:title", content: "Shop EV Parts & Accessories — Shaw Traders EV" },
      { property: "og:description", content: "Filter EV parts by category, brand, voltage, battery capacity, motor wattage and price." },
    ],
  }),
  component: Shop,
});

export function matchesSearch(p: Product, term: string) {
  const hay = [p.name, p.brand, p.model, p.sku, p.category, p.subcategory, p.voltage, p.ah, p.wattage, p.description, ...(p.compatibility ?? []), ...Object.values(p.specs ?? {})]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return term
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((t) => hay.includes(t));
}

function Filters({ search, apply }: { search: ShopSearch; apply: (s: Partial<ShopSearch>) => void }) {
  const { state } = useStore();
  const brands = Array.from(new Set([...state.brands, ...state.products.map((p) => p.brand).filter(Boolean) as string[]]));
  const voltages = Array.from(new Set(state.products.map((p) => p.voltage).filter(Boolean) as string[]));

  return (
    <div className="grid gap-6 text-sm">
      <div className="grid gap-2">
        <Label className="font-semibold">Category</Label>
        <Select value={search.category ?? "all"} onValueChange={(v) => apply({ category: v === "all" ? undefined : v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {CATEGORIES.map((c) => <SelectItem key={c.slug} value={c.slug}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-2">
        <Label className="font-semibold">Brand</Label>
        {brands.length === 0 ? (
          <p className="text-xs text-muted-foreground">Brands appear once products are added.</p>
        ) : (
          <Select value={search.brand ?? "all"} onValueChange={(v) => apply({ brand: v === "all" ? undefined : v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All brands</SelectItem>
              {brands.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
      </div>

      <div className="grid gap-2">
        <Label className="font-semibold">Price (₹)</Label>
        <div className="flex items-center gap-2">
          <Input type="number" placeholder="Min" value={search.min ?? ""} onChange={(e) => apply({ min: e.target.value ? Number(e.target.value) : undefined })} />
          <span className="text-muted-foreground">–</span>
          <Input type="number" placeholder="Max" value={search.max ?? ""} onChange={(e) => apply({ max: e.target.value ? Number(e.target.value) : undefined })} />
        </div>
      </div>

      <div className="grid gap-2">
        <Label className="font-semibold">Vehicle / Model</Label>
        <Input placeholder="e.g. scooter model" value={search.model ?? ""} onChange={(e) => apply({ model: e.target.value || undefined })} />
      </div>

      <div className="grid gap-2">
        <Label className="font-semibold">Voltage</Label>
        {voltages.length === 0 ? (
          <Input placeholder="e.g. 48V" value={search.voltage ?? ""} onChange={(e) => apply({ voltage: e.target.value || undefined })} />
        ) : (
          <Select value={search.voltage ?? "all"} onValueChange={(v) => apply({ voltage: v === "all" ? undefined : v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any voltage</SelectItem>
              {voltages.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
      </div>

      <label className="flex items-center gap-2 font-medium">
        <Checkbox checked={!!search.inStock} onCheckedChange={(c) => apply({ inStock: c === true ? true : undefined })} />
        In stock only
      </label>

      <div className="grid gap-2">
        <Label className="font-semibold">Minimum rating</Label>
        <Select value={String(search.rating ?? 0)} onValueChange={(v) => apply({ rating: Number(v) || undefined })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {[0, 3, 4].map((r) => <SelectItem key={r} value={String(r)}>{r === 0 ? "Any rating" : `${r}★ & above`}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

function Shop() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/shop" });
  const { state } = useStore();
  const [sheet, setSheet] = useState(false);

  const apply = (patch: Partial<ShopSearch>) => navigate({ search: (prev) => ({ ...prev, ...patch }) });

  const results = useMemo(() => {
    let list = state.products.slice();
    if (search.q) list = list.filter((p) => matchesSearch(p, search.q!));
    if (search.category) list = list.filter((p) => p.category === search.category);
    if (search.brand) list = list.filter((p) => p.brand === search.brand);
    if (search.model) list = list.filter((p) => matchesSearch(p, search.model!));
    if (search.voltage) list = list.filter((p) => (p.voltage ?? "").toLowerCase().includes(search.voltage!.toLowerCase()));
    if (search.min !== undefined) list = list.filter((p) => (p.price ?? Infinity) >= search.min!);
    if (search.max !== undefined) list = list.filter((p) => (p.price ?? 0) <= search.max!);
    if (search.inStock) list = list.filter((p) => (p.stock ?? 0) > 0);
    if (search.rating) {
      list = list.filter((p) => {
        const rs = state.reviews.filter((r) => r.productId === p.id && r.approved);
        if (rs.length === 0) return false;
        return rs.reduce((n, r) => n + r.rating, 0) / rs.length >= search.rating!;
      });
    }
    if (search.sort === "price-asc") list.sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity));
    if (search.sort === "price-desc") list.sort((a, b) => (b.price ?? 0) - (a.price ?? 0));
    if (search.sort === "newest") list.sort((a, b) => b.createdAt - a.createdAt);
    return list;
  }, [state.products, state.reviews, search]);

  return (
    <div className="container-page py-8">
      <SectionHeading
        title={search.q ? `Results for “${search.q}”` : "Shop All Products"}
        subtitle={`${results.length} product${results.length === 1 ? "" : "s"}`}
      />

      <div className="mb-6 lg:hidden">
        <SearchBox />
      </div>

      <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
        <aside className="hidden lg:block">
          <div className="sticky top-32 rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
            <h3 className="mb-4 font-display text-base font-bold">Filters</h3>
            <Filters search={search} apply={apply} />
          </div>
        </aside>

        <div>
          <div className="mb-4 hidden items-center justify-end lg:flex">
            <Select value={search.sort ?? "relevance"} onValueChange={(v) => apply({ sort: v === "relevance" ? undefined : v })}>
              <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="relevance">Sort: Relevance</SelectItem>
                <SelectItem value="price-asc">Price: Low to High</SelectItem>
                <SelectItem value="price-desc">Price: High to Low</SelectItem>
                <SelectItem value="newest">Newest first</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {results.length === 0 ? (
            <EmptyCatalogue
              title={state.products.length === 0 ? "Catalogue coming online" : "No matching products"}
              note={
                state.products.length === 0
                  ? undefined
                  : "Try a different search or clear some filters. You can also send us the part details on WhatsApp and we'll check stock for you."
              }
            />
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
              {results.map((p) => <ProductCard key={p.id} product={p} />)}
            </div>
          )}
        </div>
      </div>

      <Sheet open={sheet} onOpenChange={setSheet}>
        <SheetTrigger asChild>
          <Button className="fixed bottom-20 left-1/2 z-30 -translate-x-1/2 rounded-full shadow-[var(--shadow-lift)] lg:hidden">
            <SlidersHorizontal className="size-4" /> Filter & Sort
          </Button>
        </SheetTrigger>
        <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-3xl p-6">
          <h3 className="mb-4 font-display text-lg font-bold">Filter & Sort</h3>
          <div className="mb-6 grid gap-2">
            <Label className="font-semibold">Sort by</Label>
            <Select value={search.sort ?? "relevance"} onValueChange={(v) => apply({ sort: v === "relevance" ? undefined : v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="relevance">Relevance</SelectItem>
                <SelectItem value="price-asc">Price: Low to High</SelectItem>
                <SelectItem value="price-desc">Price: High to Low</SelectItem>
                <SelectItem value="newest">Newest first</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Filters search={search} apply={apply} />
          <Button className="mt-6 w-full" onClick={() => setSheet(false)}>Show {results.length} results</Button>
        </SheetContent>
      </Sheet>
    </div>
  );
}
