import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { EmptyCatalogue, SectionHeading } from "@/components/site/Empty";
import { ProductCard } from "@/components/site/ProductCard";
import { useStore } from "@/hooks/useStore";
import { CATEGORIES, categoryBySlug } from "@/lib/catalog";

export const Route = createFileRoute("/category/$slug")({
  loader: ({ params }) => {
    const category = categoryBySlug(params.slug);
    if (!category) throw notFound();
    return { category };
  },
  head: ({ loaderData }) => {
    if (!loaderData) return { meta: [{ title: "Category not found — Shaw Traders EV" }, { name: "robots", content: "noindex" }] };
    const title = `${loaderData.category.name} — Buy Online | Shaw Traders EV`;
    const description = `${loaderData.category.name} for electric scooters, e-bikes and e-rickshaws. ${loaderData.category.blurb}. Available at Shaw Traders EV, Bud Bud, Bardhaman.`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
      ],
    };
  },
  component: CategoryPage,
  notFoundComponent: () => (
    <div className="container-page py-16 text-center">
      <h1 className="font-display text-2xl font-bold">Category not found</h1>
      <Button className="mt-5" asChild><Link to="/categories">Browse all categories</Link></Button>
    </div>
  ),
});

function CategoryPage() {
  const { category } = Route.useLoaderData();
  const { state } = useStore();
  const products = state.products.filter((p) => p.category === category.slug);

  return (
    <div className="container-page py-10">
      <nav className="mb-5 text-xs text-muted-foreground">
        <Link to="/" className="hover:text-foreground">Home</Link> / <Link to="/categories" className="hover:text-foreground">Categories</Link> /{" "}
        <span className="text-foreground">{category.name}</span>
      </nav>
      <SectionHeading title={category.name} subtitle={category.blurb} />
      {products.length === 0 ? (
        <EmptyCatalogue title={`${category.name} listings coming soon`} />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {products.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      )}

      <div className="mt-12">
        <h2 className="mb-4 font-display text-lg font-bold">Other categories</h2>
        <div className="hide-scrollbar flex gap-2 overflow-x-auto">
          {CATEGORIES.filter((c) => c.slug !== category.slug).map((c) => (
            <Link key={c.slug} to="/category/$slug" params={{ slug: c.slug }} className="shrink-0 rounded-full border border-border bg-card px-4 py-2 text-sm hover:border-primary">
              {c.name}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
