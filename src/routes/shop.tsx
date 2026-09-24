import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { MessageCircle, SlidersHorizontal } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { ProductGridSkeleton, SectionHeading } from "@/components/site/Empty";
import { ProductCard } from "@/components/site/ProductCard";
import { SearchBox } from "@/components/site/SearchBox";
import { BUSINESS, canonical, whatsappLink } from "@/lib/catalog";
import { categoriesQuery, facetsQuery, productsQuery } from "@/lib/queries";
import { useVehicle } from "@/hooks/useVehicle";

type ShopSearch = {
  q?: string;
  category?: string;
  brand?: string;
  min?: number;
  max?: number;
  sort?: string;
  inStock?: boolean;
  voltage?: string;
  ah?: string;
  model?: string;
  all?: boolean;
  page?: number;
};

const PAGE_SIZE = 24;

export const Route = createFileRoute("/shop")({
  validateSearch: (search: Record<string, unknown>): ShopSearch => ({
    q: typeof search['q'] === "string" ? search['q'] : undefined,
    category: typeof search['category'] === "string" ? search['category'] : undefined,
    brand: typeof search['brand'] === "string" ? search['brand'] : undefined,
    min: search['min'] ? Number(search['min']) : undefined,
    max: search['max'] ? Number(search['max']) : undefined,
    sort: typeof search['sort'] === "string" ? search['sort'] : undefined,
    inStock: search['inStock'] === true || search['inStock'] === "true" ? true : undefined,
    voltage: typeof search['voltage'] === "string" ? search['voltage'] : undefined,
    ah: typeof search['ah'] === "string" ? search['ah'] : undefined,
    model: typeof search['model'] === "string" ? search['model'] : undefined,
    all: search['all'] === true || search['all'] === "true" ? true : undefined,
    page: search['page'] ? Number(search['page']) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Shop EV Spare Parts" },
      { name: "description", content: "Search and filter EV batteries, chargers, motors, controllers, body parts and accessories by brand, voltage, capacity and price." },
      { property: "og:title", content: "Shop EV Spare Parts" },
      { property: "og:description", content: "Filter EV parts by category, brand, voltage, battery capacity, motor wattage and price." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: canonical("/shop") },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: canonical("/shop") }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: canonical("/") },
            { "@type": "ListItem", position: 2, name: "Shop", item: canonical("/shop") },
          ],
        }),
      },
    ],
  }),
  component: Shop,
});

function Filters({ search, apply }: { search: ShopSearch; apply: (s: Partial<ShopSearch>) => void }) {
  const { data: categories } = useQuery(categoriesQuery());
  const { data: facets } = useQuery(facetsQuery());
  const brands = facets?.brands ?? [];
  const voltages = facets?.voltages ?? [];
  const ahs = facets?.ahs ?? [];
  const models = facets?.models ?? [];

  return (
    <div className="filters-panel grid gap-5 text-sm">
      <div className="grid gap-2">
        <Label className="font-semibold">Category</Label>
        <Select value={search.category ?? "all"} onValueChange={(v) => apply({ category: v === "all" ? undefined : v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {(categories ?? []).map((c) => <SelectItem key={c.slug} value={c.slug}>{c.name}</SelectItem>)}
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
            <SelectContent className="max-h-72">
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
        {models.length === 0 ? (
          <Input placeholder="e.g. scooter model" value={search.model ?? ""} onChange={(e) => apply({ model: e.target.value || undefined })} />
        ) : (
          <Select value={search.model ?? "all"} onValueChange={(v) => apply({ model: v === "all" ? undefined : v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent className="max-h-72">
              <SelectItem value="all">Any vehicle</SelectItem>
              {models.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
      </div>

      <div className="grid gap-2">
        <Label className="font-semibold">Voltage</Label>
        {voltages.length === 0 ? (
          <Input placeholder="e.g. 48V" value={search.voltage ?? ""} onChange={(e) => apply({ voltage: e.target.value || undefined })} />
        ) : (
          <Select value={search.voltage ?? "all"} onValueChange={(v) => apply({ voltage: v === "all" ? undefined : v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent className="max-h-72">
              <SelectItem value="all">Any voltage</SelectItem>
              {voltages.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
      </div>

      <div className="grid gap-2">
        <Label className="font-semibold">Battery capacity (Ah)</Label>
        {ahs.length === 0 ? (
          <Input placeholder="e.g. 32Ah" value={search.ah ?? ""} onChange={(e) => apply({ ah: e.target.value || undefined })} />
        ) : (
          <Select value={search.ah ?? "all"} onValueChange={(v) => apply({ ah: v === "all" ? undefined : v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent className="max-h-72">
              <SelectItem value="all">Any capacity</SelectItem>
              {ahs.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
      </div>

      <label className="flex items-center gap-2 font-medium">
        <Checkbox checked={!!search.inStock} onCheckedChange={(c) => apply({ inStock: c === true ? true : undefined })} />
        In stock only
      </label>
    </div>
  );
}

function Shop() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/shop" });
  const [sheet, setSheet] = useState(false);
  const { vehicle } = useVehicle();

  // A saved scooter filters the list to parts that fit, until "All parts" is chosen.
  useEffect(() => {
    if (!vehicle || search.model || search.all) return;
    void navigate({ search: (prev) => ({ ...prev, model: vehicle.model, page: undefined }) });
  }, [vehicle, search.model, search.all, navigate]);

  const apply = (patch: Partial<ShopSearch>) =>
    navigate({ search: (prev) => ({ ...prev, ...patch, page: undefined }) });

  const page = Math.max(0, (search.page ?? 1) - 1);
  const { data, isPending } = useQuery({
    ...productsQuery({
      ...(search.q ? { q: search.q } : {}),
      ...(search.category ? { category: search.category } : {}),
      ...(search.brand ? { brand: search.brand } : {}),
      ...(search.voltage ? { voltage: search.voltage } : {}),
      ...(search.ah ? { ah: search.ah } : {}),
      ...(search.model ? { model: search.model } : {}),
      ...(search.min !== undefined ? { min: search.min } : {}),
      ...(search.max !== undefined ? { max: search.max } : {}),
      ...(search.inStock ? { inStock: true } : {}),
      ...(search.sort ? { sort: search.sort } : {}),
      page,
      pageSize: PAGE_SIZE,
    }),
    placeholderData: keepPreviousData,
  });

  const results = data?.items ?? [];
  const total = data?.total ?? 0;
  const pages = Math.ceil(total / PAGE_SIZE);

  // Record searches that came back empty so the owner can see what customers want.
  const term = search.q?.trim() ?? "";
  useEffect(() => {
    if (!term || isPending || total > 0) return;
    void supabase.rpc("log_search_miss", { p_term: term });
  }, [term, isPending, total]);

  return (
    <div className="container-page py-8">
      <SectionHeading
        as="h1"
        title={search.q ? `Results for “${search.q}”` : "Shop All Products"}
        subtitle={isPending ? "Loading products…" : `${total} product${total === 1 ? "" : "s"}`}
      />

      {vehicle && (
        <div className="mb-6 flex flex-wrap items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3 text-sm">
          <span>
            {search.model
              ? `Showing parts that fit your ${search.model}`
              : `Showing all parts — your scooter is a ${vehicle.model}`}
          </span>
          {search.model ? (
            <Button size="sm" variant="outline" onClick={() => navigate({ search: (prev) => ({ ...prev, model: undefined, all: true, page: undefined }) })}>
              All parts
            </Button>
          ) : (
            <Button size="sm" variant="outline" onClick={() => navigate({ search: (prev) => ({ ...prev, model: vehicle.model, all: undefined, page: undefined }) })}>
              Only parts that fit
            </Button>
          )}
        </div>
      )}

      <div className="mb-6 lg:hidden">
        <SearchBox />
      </div>

      <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
        <aside className="hidden lg:block">
          <div className="sticky top-32 border-r border-border pr-6">
            <h3 className="eyebrow mb-5">Filters</h3>
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

          {isPending ? (
            <ProductGridSkeleton count={12} />
          ) : results.length === 0 ? (
            <div className="rounded-3xl border border-border bg-card p-8 text-center shadow-[var(--shadow-card)]">
              <h2 className="font-display text-xl font-bold">
                {term ? `Nothing found for “${term}”` : "No matching products"}
              </h2>
              <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                We may still have this part at the counter. Send us the part name or a photo of the old one on WhatsApp and we
                will check for you.
              </p>
              <div className="mt-5 flex flex-wrap justify-center gap-3">
                <Button asChild>
                  <a
                    href={whatsappLink(
                      term
                        ? `Hello ${BUSINESS.name}, I am looking for "${term}". Do you have it?`
                        : `Hello ${BUSINESS.name}, I am looking for a part. Can you help?`,
                    )}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <MessageCircle className="size-4" /> Ask on WhatsApp
                  </a>
                </Button>
                <Button variant="outline" asChild>
                  <a href={`tel:${BUSINESS.phone}`}>Call {BUSINESS.phone}</a>
                </Button>
                <Button variant="ghost" onClick={() => navigate({ search: {} })}>
                  Clear all filters
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
                {results.map((p) => <ProductCard key={p.id} product={p} />)}
              </div>
              {pages > 1 && (
                <div className="mt-8 flex items-center justify-center gap-3">
                  <Button
                    variant="outline"
                    disabled={page === 0}
                    onClick={() => navigate({ search: (prev) => ({ ...prev, page: page }) })}
                  >
                    Previous
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Page {page + 1} of {pages}
                  </span>
                  <Button
                    variant="outline"
                    disabled={page + 1 >= pages}
                    onClick={() => navigate({ search: (prev) => ({ ...prev, page: page + 2 }) })}
                  >
                    Next
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <Sheet open={sheet} onOpenChange={setSheet}>
        <SheetTrigger asChild>
          <Button className="fixed bottom-20 left-1/2 z-30 -translate-x-1/2 rounded-full shadow-[var(--shadow-lift)] lg:hidden">
            <SlidersHorizontal className="size-4" /> Filter & Sort
          </Button>
        </SheetTrigger>
        <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-2xl px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3">
          <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-border" aria-hidden />
          <h3 className="mb-4 font-display text-lg font-semibold">Filter & Sort</h3>
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
          <Button className="mt-6 w-full" onClick={() => setSheet(false)}>Show {total} results</Button>
        </SheetContent>
      </Sheet>
    </div>
  );
}
