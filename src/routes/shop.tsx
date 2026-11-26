import { createFileRoute, Link, useNavigate, useRouter, useRouterState } from "@tanstack/react-router";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { MessageCircle, SlidersHorizontal } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { SectionHeading } from "@/components/site/Empty";
import { SparkCharge, SparkRing } from "@/components/site/SparkLoaders";
import { shopIsUpdating } from "@/lib/shop-loading";
import { ProductCard } from "@/components/site/ProductCard";
import { BUSINESS, canonical, whatsappLink } from "@/lib/catalog";
import { categoriesQuery, facetsQuery, productsQuery } from "@/lib/queries";
import { clearSavedVehicle, useVehicle } from "@/hooks/useVehicle";
import { useT, useCategoryName } from "@/lib/i18n";
import type { ProductFilters } from "@/lib/catalog.functions";

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

/** Turn the address-bar filters into the product query (shared by server load and browser). */
function filtersFor(search: ShopSearch): ProductFilters {
  return {
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
    page: Math.max(0, (search.page ?? 1) - 1),
    pageSize: PAGE_SIZE,
  };
}

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
  loaderDeps: ({ search }) => ({ filters: filtersFor(search) }),
  // Load the first page on the server so product names are in the page HTML.
  // Filter options are not awaited: they are the slowest read and only fill
  // the filter panel, so the browser loads them after the page appears.
  loader: async ({ context, deps }) => {
    const initial = await context.queryClient.ensureQueryData(productsQuery(deps.filters)).catch(() => null);
    return { filters: deps.filters, initial };
  },
  head: () => ({
    meta: [
      { title: "Shop EV Spare Parts — Shaw Traders EV" },
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
  const t = useT();
  const { data: categories } = useQuery(categoriesQuery());
  const categoryName = useCategoryName();
  const { data: facets } = useQuery(facetsQuery());
  const brands = facets?.brands ?? [];
  const voltages = facets?.voltages ?? [];
  const ahs = facets?.ahs ?? [];
  const models = facets?.models ?? [];

  return (
    <div className="filters-panel grid gap-5 text-sm">
      <div className="grid gap-2">
        <Label className="font-semibold">{t("shop.category")}</Label>
        <Select value={search.category ?? "all"} onValueChange={(v) => apply({ category: v === "all" ? undefined : v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("shop.allCategories")}</SelectItem>
            {(categories ?? []).map((c) => <SelectItem key={c.slug} value={c.slug}>{categoryName(c)}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-2">
        <Label className="font-semibold">{t("shop.brand")}</Label>
        {brands.length === 0 ? (
          <p className="text-xs text-muted-foreground">{t("shop.brandsEmpty")}</p>
        ) : (
          <Select value={search.brand ?? "all"} onValueChange={(v) => apply({ brand: v === "all" ? undefined : v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent className="max-h-72">
              <SelectItem value="all">{t("shop.allBrands")}</SelectItem>
              {brands.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
      </div>

      <div className="grid gap-2">
        <Label className="font-semibold">{t("shop.price")}</Label>
        <div className="flex items-center gap-2">
          <Input type="number" placeholder={t("shop.min")} value={search.min ?? ""} onChange={(e) => apply({ min: e.target.value ? Number(e.target.value) : undefined })} />
          <span className="text-muted-foreground">–</span>
          <Input type="number" placeholder={t("shop.max")} value={search.max ?? ""} onChange={(e) => apply({ max: e.target.value ? Number(e.target.value) : undefined })} />
        </div>
      </div>

      <div className="grid gap-2">
        <Label className="font-semibold">{t("shop.vehicle")}</Label>
        {models.length === 0 ? (
          <Input placeholder={t("shop.modelPlaceholder")} value={search.model ?? ""} onChange={(e) => apply({ model: e.target.value || undefined })} />
        ) : (
          <Select value={search.model ?? "all"} onValueChange={(v) => apply({ model: v === "all" ? undefined : v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent className="max-h-72">
              <SelectItem value="all">{t("shop.anyVehicle")}</SelectItem>
              {models.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
      </div>

      <div className="grid gap-2">
        <Label className="font-semibold">{t("shop.voltage")}</Label>
        {voltages.length === 0 ? (
          <Input placeholder="e.g. 48V" value={search.voltage ?? ""} onChange={(e) => apply({ voltage: e.target.value || undefined })} />
        ) : (
          <Select value={search.voltage ?? "all"} onValueChange={(v) => apply({ voltage: v === "all" ? undefined : v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent className="max-h-72">
              <SelectItem value="all">{t("shop.anyVoltage")}</SelectItem>
              {voltages.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
      </div>

      <div className="grid gap-2">
        <Label className="font-semibold">{t("shop.capacity")}</Label>
        {ahs.length === 0 ? (
          <Input placeholder="e.g. 32Ah" value={search.ah ?? ""} onChange={(e) => apply({ ah: e.target.value || undefined })} />
        ) : (
          <Select value={search.ah ?? "all"} onValueChange={(v) => apply({ ah: v === "all" ? undefined : v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent className="max-h-72">
              <SelectItem value="all">{t("shop.anyCapacity")}</SelectItem>
              {ahs.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
      </div>

      <label className="flex items-center gap-2 font-medium">
        <Checkbox checked={!!search.inStock} onCheckedChange={(c) => apply({ inStock: c === true ? true : undefined })} />
        {t("shop.inStockOnly")}
      </label>
    </div>
  );
}

function Shop() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/shop" });
  const [sheet, setSheet] = useState(false);
  const router = useRouter();
  const { vehicle } = useVehicle();

  // The finder passes model/category explicitly. Clear that temporary choice
  // when leaving the shop so it cannot silently return on a later visit.
  // Keep this cleanup silent while the old product grid is still mounted.
  // Broadcasting the vehicle change here synchronously updates every card
  // during React's route transition and can prevent the new route committing.
  useEffect(() => {
    return router.subscribe("onBeforeNavigate", ({ fromLocation, toLocation }) => {
      if (fromLocation?.pathname !== "/shop" || toLocation.pathname === "/shop") return;
      clearSavedVehicle();
    });
  }, [router]);

  const apply = (patch: Partial<ShopSearch>) =>
    navigate({ search: (prev) => ({ ...prev, ...patch, page: undefined }) });

  const t = useT();
  const loaded = Route.useLoaderData();
  const filters = filtersFor(search);
  const page = filters.page ?? 0;
  const sameFilters = JSON.stringify(loaded.filters) === JSON.stringify(filters);
  const { data, isPending, isFetching, isPlaceholderData } = useQuery({
    ...productsQuery(filters),
    ...(sameFilters && loaded.initial ? { initialData: loaded.initial } : {}),
    placeholderData: keepPreviousData,
  });
  // Next/Previous and filter changes keep the old products on screen until
  // the new ones arrive; dim them and show a loader so the page never looks stuck.
  const routerLoading = useRouterState({ select: (s) => s.isLoading });
  const pendingPath = useRouterState({ select: (s) => s.location.pathname });
  const updating = shopIsUpdating({
    routerLoading,
    pendingPath,
    showingOldResults: isFetching && isPlaceholderData,
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
        title={search.q ? `${t("shop.resultsFor")} “${search.q}”` : t("nav.shop")}
        subtitle={isPending ? t("shop.loading") : `${total} ${total === 1 ? t("shop.productOne") : t("shop.productMany")}`}
      />

      {vehicle && (
        <div className="mb-6 flex flex-wrap items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3 text-sm">
          <span>
            {search.model
              ? `${t("shop.fitsYour")} ${search.model}`
              : `${t("shop.allPartsYour")} ${vehicle.model}`}
          </span>
          {search.model ? (
            <Button size="sm" variant="outline" onClick={() => navigate({ search: (prev) => ({ ...prev, model: undefined, all: true, page: undefined }) })}>
              {t("shop.allParts")}
            </Button>
          ) : (
            <Button size="sm" variant="outline" onClick={() => navigate({ search: (prev) => ({ ...prev, model: vehicle.model, all: undefined, page: undefined }) })}>
              {t("shop.onlyFit")}
            </Button>
          )}
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
        <aside className="hidden lg:block">
          <div className="sticky top-32 border-r border-border pr-6">
            <h3 className="eyebrow mb-5">{t("shop.filters")}</h3>
            <Filters search={search} apply={apply} />
          </div>
        </aside>

        <div>
          <div className="mb-4 lg:hidden">
            <Button variant="outline" className="w-full" onClick={() => setSheet(true)}>
              <SlidersHorizontal className="size-4" /> {t("shop.filterSort")}
            </Button>
          </div>
          <div className="mb-4 hidden items-center justify-end lg:flex">
            <Select value={search.sort ?? "relevance"} onValueChange={(v) => apply({ sort: v === "relevance" ? undefined : v })}>
              <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="relevance">{t("shop.sortPrefix")}: {t("shop.sortRelevance")}</SelectItem>
                <SelectItem value="price-asc">{t("shop.priceAsc")}</SelectItem>
                <SelectItem value="price-desc">{t("shop.priceDesc")}</SelectItem>
                <SelectItem value="newest">{t("shop.newest")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isPending ? (
            <SparkCharge label={t("shop.loading")} />
          ) : results.length === 0 ? (
            <div className="rounded-3xl border border-border bg-card p-8 text-center shadow-[var(--shadow-card)]">
              <h2 className="font-display text-xl font-bold">
                {term ? `${t("shop.nothingFound")} “${term}”` : t("shop.noMatch")}
              </h2>
              <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                {t("shop.noMatchBody")}
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
                    <MessageCircle className="size-4" /> {t("shop.askWhatsapp")}
                  </a>
                </Button>
                <Button variant="outline" asChild>
                  <a href={`tel:${BUSINESS.phone}`}>{t("shop.call")} {BUSINESS.phone}</a>
                </Button>
                <Button variant="ghost" onClick={() => navigate({ search: {} })}>
                  {t("shop.clearFilters")}
                </Button>
              </div>
            </div>
          ) : (
            <div aria-busy={updating}>
              <div
                className={`grid grid-cols-2 gap-3 transition-opacity sm:grid-cols-3 xl:grid-cols-4 ${updating ? "pointer-events-none opacity-50" : ""}`}
              >
                {results.map((p) => <ProductCard key={p.id} product={p} />)}
              </div>
              {updating && (
                <div className="pointer-events-none fixed inset-x-0 bottom-24 z-40 flex justify-center lg:bottom-8">
                  <span className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-sm font-medium shadow-[var(--shadow-card)]">
                    <SparkRing label={t("shop.loading")} /> {t("shop.loading")}
                  </span>
                </div>
              )}
              {pages > 1 && (
                <div className="mt-8 flex items-center justify-center gap-3">
                  {page === 0 ? (
                    <Button variant="outline" disabled>{t("shop.previous")}</Button>
                  ) : (
                    <Button variant="outline" asChild>
                      <Link to="/shop" search={(prev) => ({ ...prev, page: page === 1 ? undefined : page })} rel="prev">
                        {t("shop.previous")}
                      </Link>
                    </Button>
                  )}
                  <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                    {updating && <SparkRing size="sm" />}
                    {t("shop.page")} {page + 1} {t("shop.of")} {pages}
                  </span>
                  {page + 1 >= pages ? (
                    <Button variant="outline" disabled>{t("shop.next")}</Button>
                  ) : (
                    <Button variant="outline" asChild>
                      <Link to="/shop" search={(prev) => ({ ...prev, page: page + 2 })} rel="next">
                        {t("shop.next")}
                      </Link>
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <Sheet open={sheet} onOpenChange={setSheet}>
        <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-2xl px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3">
          <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-border" aria-hidden />
          <h3 className="mb-4 font-display text-lg font-semibold">{t("shop.filterSort")}</h3>
          <div className="mb-6 grid gap-2">
            <Label className="font-semibold">{t("shop.sortBy")}</Label>
            <Select value={search.sort ?? "relevance"} onValueChange={(v) => apply({ sort: v === "relevance" ? undefined : v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="relevance">{t("shop.sortRelevance")}</SelectItem>
                <SelectItem value="price-asc">{t("shop.priceAsc")}</SelectItem>
                <SelectItem value="price-desc">{t("shop.priceDesc")}</SelectItem>
                <SelectItem value="newest">{t("shop.newest")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Filters search={search} apply={apply} />
          <Button className="mt-6 w-full" onClick={() => setSheet(false)}>{t("shop.showResults")} ({total})</Button>
        </SheetContent>
      </Sheet>
    </div>
  );
}
