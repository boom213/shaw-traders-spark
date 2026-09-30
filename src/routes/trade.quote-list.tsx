import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ImageIcon, Minus, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SectionHeading } from "@/components/site/Empty";
import { SparkCharge } from "@/components/site/SparkLoaders";
import { useQuoteAccess, useQuoteList } from "@/hooks/useQuoteList";
import { useT } from "@/lib/i18n";
import { canonical } from "@/lib/catalog";
import { productsByIdsQuery } from "@/lib/queries";
import { productThumbnailUrl } from "@/lib/product-photo";
import { normalizeQuoteQty } from "@/lib/quote-draft";

export const Route = createFileRoute("/trade/quote-list")({
  head: () => ({
    meta: [
      { title: "Wholesale Quote List — Shaw Traders EV" },
      { name: "description", content: "Review EV parts and quantities before requesting wholesale rates from Shaw Traders EV." },
      { property: "og:title", content: "Wholesale Quote List — Shaw Traders EV" },
      { property: "og:description", content: "Review your wholesale parts quote list." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
    links: [{ rel: "canonical", href: canonical("/trade/quote-list") }],
  }),
  component: QuoteListPage,
});

function QuoteListPage() {
  const t = useT();
  const access = useQuoteAccess();
  const quote = useQuoteList();
  const ids = quote.lines.map((line) => line.productId);
  const productsQuery = useQuery(productsByIdsQuery(ids));
  const byId = new Map((productsQuery.data ?? []).map((product) => [product.id, product]));

  if (!access.ready || !quote.ready || (ids.length > 0 && productsQuery.isPending)) {
    return <div className="container-page"><SparkCharge label="Loading your quote list…" /></div>;
  }
  if (!access.allowed) {
    return <div className="container-page py-16 text-center"><SectionHeading title="Wholesale account required" subtitle="An approved wholesale account is required to use a quote list." /><Button asChild><Link to="/trade">Open wholesale account</Link></Button></div>;
  }

  const lines = quote.lines.flatMap((line) => {
    const product = byId.get(line.productId);
    return product ? [{ ...line, product }] : [];
  });

  return (
    <div className="container-page py-10">
      <SectionHeading as="h1" title={t("quote.title")} subtitle={t("quote.subtitle")} />
      {productsQuery.isError ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-6 py-10 text-center">
          <p className="text-sm font-semibold text-destructive">We could not load your quote list.</p>
          <Button className="mt-5" variant="outline" onClick={() => void productsQuery.refetch()}>Try again</Button>
        </div>
      ) : lines.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border bg-surface px-6 py-14 text-center">
          <p className="font-semibold">{t("quote.empty")}</p>
          <Button className="mt-5" asChild><Link to="/shop">{t("quote.browse")}</Link></Button>
        </div>
      ) : (
        <div className="grid gap-8 lg:grid-cols-[1fr_300px]">
          <div className="grid gap-3">
            {lines.map(({ product, qty }) => (
              <article key={product.id} className="flex gap-4 rounded-2xl border border-border bg-card p-4">
                <div className="size-20 shrink-0 overflow-hidden rounded-xl bg-surface">
                  {product.images[0] ? <img src={productThumbnailUrl(product.images[0]) ?? product.images[0]} alt={product.name} width={80} height={80} className="size-full object-cover" /> : <span className="grid size-full place-items-center text-muted-foreground"><ImageIcon className="size-5" /></span>}
                </div>
                <div className="min-w-0 flex-1">
                  <Link to="/product/$slug" params={{ slug: product.slug }} className="text-sm font-semibold hover:text-primary">{product.name}</Link>
                  <p className="mt-0.5 text-xs text-muted-foreground">SKU: {product.sku || "—"}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <div className="flex h-9 items-center rounded-md border border-input">
                      <Button type="button" variant="ghost" size="icon" className="h-8" onClick={() => quote.setQty(product.id, qty - 1)} aria-label="Decrease quantity"><Minus className="size-3.5" /></Button>
                      <Input type="number" min={1} max={9999} value={qty} onChange={(event) => quote.setQty(product.id, normalizeQuoteQty(event.target.value))} className="h-8 w-20 border-0 px-1 text-center shadow-none focus-visible:ring-0" aria-label={`Quantity for ${product.name}`} />
                      <Button type="button" variant="ghost" size="icon" className="h-8" onClick={() => quote.setQty(product.id, qty + 1)} aria-label="Increase quantity"><Plus className="size-3.5" /></Button>
                    </div>
                    <Button type="button" variant="ghost" size="sm" className="text-destructive" onClick={() => quote.remove(product.id)}><Trash2 className="size-3.5" /> Remove</Button>
                  </div>
                </div>
              </article>
            ))}
          </div>
          <aside className="h-fit border-t border-border pt-5 lg:sticky lg:top-32 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
            <p className="text-sm text-muted-foreground">{lines.length} {lines.length === 1 ? "part" : "parts"}</p>
            <Button className="mt-4 w-full" size="lg" asChild><Link to="/trade/quote-submit">{t("quote.continue")}</Link></Button>
          </aside>
        </div>
      )}
    </div>
  );
}