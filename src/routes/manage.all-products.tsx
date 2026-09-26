import { createFileRoute, Link } from "@tanstack/react-router";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ChevronLeft, ChevronRight, PackageSearch } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { allProductsList } from "@/lib/catalogue-admin.functions";
import { STATUS_CHIP, isProductStatus } from "@/lib/ordering";
import { placeholderFor } from "@/lib/placeholders";
import { categoriesQuery } from "@/lib/queries";
import { can } from "@/lib/staff-permissions";

export const Route = createFileRoute("/manage/all-products")({
  head: () => ({
    meta: [
      { title: "All Products — Shaw Traders EV Manager" },
      { name: "description", content: "Search and review the complete Shaw Traders EV product directory." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "All Products — Shaw Traders EV Manager" },
      { property: "og:description", content: "Search and review the complete Shaw Traders EV product directory." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AllProductsPage,
});

const PAGE_SIZES = [10, 20, 50, 100] as const;
const STATUS_OPTIONS = [
  { value: "", label: "All visibility" },
  { value: "visible", label: "Visible" },
  { value: "draft", label: "Draft" },
  { value: "hidden", label: "Hidden" },
] as const;

function money(value: number | null) {
  return value === null ? "—" : `₹${value.toLocaleString("en-IN")}`;
}

function AllProductsPage() {
  const { staff } = Route.useRouteContext();
  const canEdit = can(staff.role, "catalogue");
  const [query, setQuery] = useState("");
  const [term, setTerm] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState<number>(20);
  const { data: categories } = useQuery(categoriesQuery());
  const { data, isPending, isFetching } = useQuery({
    queryKey: ["all-products-admin", term, category, status, page, pageSize],
    queryFn: () => allProductsList({ data: { q: term, category, status, page, pageSize } }),
    placeholderData: keepPreviousData,
  });

  const products = data?.items ?? [];
  const total = data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : page * pageSize + 1;
  const to = Math.min(total, (page + 1) * pageSize);

  return (
    <section className="space-y-4">
      <div className="border-b border-border pb-5">
        <div className="flex items-start gap-3">
          <PackageSearch className="mt-0.5 size-6 text-primary" />
          <div>
            <h2 className="font-display text-xl font-bold">All Products</h2>
            <p className="mt-1 text-sm text-muted-foreground">Search and review the complete catalogue. This page is view only.</p>
          </div>
        </div>

        <form className="mt-4 flex gap-2" onSubmit={(event) => { event.preventDefault(); setTerm(query.trim()); setPage(0); }}>
          <Input aria-label="Search products" placeholder="Search name, SKU, brand, model or shelf" value={query} onChange={(event) => setQuery(event.target.value)} />
          <Button type="submit" variant="outline">Search</Button>
        </form>

        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <select aria-label="Category" value={category} onChange={(event) => { setCategory(event.target.value); setPage(0); }} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
            <option value="">All categories</option>
            {(categories ?? []).map((item) => <option key={item.slug} value={item.slug}>{item.name}</option>)}
          </select>
          <select aria-label="Visibility" value={status} onChange={(event) => { setStatus(event.target.value); setPage(0); }} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
            {STATUS_OPTIONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
          <span>{total} products found{isFetching && !isPending ? " · Updating…" : ""}</span>
          <label className="flex items-center gap-2 font-medium text-foreground">Rows per page
            <select aria-label="Rows per page" value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setPage(0); }} className="h-9 rounded-md border border-input bg-background px-2 text-sm">
              {PAGE_SIZES.map((size) => <option key={size} value={size}>{size}</option>)}
            </select>
          </label>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <div className="hidden grid-cols-[4rem_minmax(12rem,2fr)_minmax(7rem,1fr)_minmax(6rem,1fr)_repeat(5,minmax(5rem,.7fr))] gap-3 border-b border-border bg-muted/60 px-4 py-3 text-xs font-semibold uppercase text-muted-foreground lg:grid">
          <span>Photo</span><span>Product</span><span>Category</span><span>Brand</span><span>Price</span><span>MRP</span><span>Stock</span><span>Warn at</span><span>Shelf</span>
        </div>
        {isPending ? (
          <div className="space-y-2 p-4">{[0, 1, 2, 3].map((item) => <div key={item} className="h-20 animate-pulse rounded-md bg-muted" />)}</div>
        ) : products.length === 0 ? (
          <p className="p-10 text-center text-sm text-muted-foreground">No products match your search.</p>
        ) : products.map((product) => {
          const productStatus = isProductStatus(product.status) ? product.status : "hidden";
          return (
            <article key={product.id} className="grid gap-3 border-b border-border p-4 last:border-b-0 lg:grid-cols-[4rem_minmax(12rem,2fr)_minmax(7rem,1fr)_minmax(6rem,1fr)_repeat(5,minmax(5rem,.7fr))] lg:items-center">
              {canEdit ? <Link to="/manage/products/$productId" params={{ productId: product.id }} aria-label={`Edit ${product.name}`} className="block size-16 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><img src={product.images[0] ?? placeholderFor(product.category)} alt="" className="size-16 rounded-md border border-border object-cover transition-opacity hover:opacity-80" /></Link> : <img src={product.images[0] ?? placeholderFor(product.category)} alt="" className="size-16 rounded-md border border-border object-cover" />}
              <div className="min-w-0">
                {canEdit ? <Link to="/manage/products/$productId" params={{ productId: product.id }} className="font-semibold leading-snug text-primary hover:underline">{product.name}</Link> : <p className="font-semibold leading-snug">{product.name}</p>}
                <p className="mt-1 text-xs text-muted-foreground">{product.sku}</p>
                <span className={`mt-2 inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS_CHIP[productStatus].className}`}>{STATUS_CHIP[productStatus].label}</span>
              </div>
              <Detail label="Category" value={product.categoryName || "—"} />
              <Detail label="Brand" value={product.brand || "—"} />
              <Detail label="Price" value={money(product.price)} />
              <Detail label="MRP" value={money(product.mrp)} />
              <Detail label="Stock" value={String(product.stock)} emphasize={product.stock <= (product.reorderThreshold ?? 3)} />
              <Detail label="Warn at" value={product.reorderThreshold === null ? "—" : String(product.reorderThreshold)} />
              <Detail label="Shelf" value={product.rackLocation || "—"} />
            </article>
          );
        })}
      </div>

      <div className="sticky bottom-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card p-3 shadow-[var(--shadow-card)]">
        <span className="text-sm text-muted-foreground">Showing {from}–{to} of {total}</span>
        <div className="flex items-center gap-2">
          <Button aria-label="Previous page" variant="outline" size="icon" disabled={page === 0 || isFetching} onClick={() => setPage((current) => Math.max(0, current - 1))}><ChevronLeft className="size-4" /></Button>
          <span className="min-w-24 text-center text-sm">Page {page + 1} of {pages}</span>
          <Button aria-label="Next page" variant="outline" size="icon" disabled={page + 1 >= pages || isFetching} onClick={() => setPage((current) => Math.min(pages - 1, current + 1))}><ChevronRight className="size-4" /></Button>
        </div>
      </div>
    </section>
  );
}

function Detail({ label, value, emphasize = false }: { label: string; value: string; emphasize?: boolean }) {
  return <div className="min-w-0"><p className="text-[11px] font-semibold uppercase text-muted-foreground lg:hidden">{label}</p><p className={emphasize ? "truncate text-sm font-semibold text-destructive" : "truncate text-sm"}>{value}</p></div>;
}