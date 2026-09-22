import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { EmptyCatalogue, ProductGridSkeleton, SectionHeading } from "@/components/site/Empty";
import { ProductCard } from "@/components/site/ProductCard";
import { canonical } from "@/lib/catalog";
import { categoriesQuery, categoryQuery, productsQuery } from "@/lib/queries";

export const Route = createFileRoute("/category/$slug")({
  loader: async ({ context, params }) => {
    const category = await context.queryClient.ensureQueryData(categoryQuery(params.slug));
    if (!category) throw notFound();
    await context.queryClient.ensureQueryData(productsQuery({ category: params.slug, pageSize: 48 }));
    return { category };
  },
  head: ({ loaderData, params }) => {
    if (!loaderData) return { meta: [{ title: "Category not found — Shaw Traders EV" }, { name: "robots", content: "noindex" }] };
    const title = `${loaderData.category.name} — Buy Online | Shaw Traders EV`;
    const description = `${loaderData.category.name} for electric scooters, e-bikes and e-rickshaws. ${loaderData.category.blurb}. Available at Shaw Traders EV, Bud Bud, Bardhaman.`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
      links: [{ rel: "canonical", href: canonical(`/category/${params.slug}`) }],
    };
  },
  component: CategoryPage,
  errorComponent: ({ error }) => (
    <div role="alert" className="container-page py-20 text-center text-sm text-muted-foreground">{error.message}</div>
  ),
  notFoundComponent: () => (
    <div className="container-page py-16 text-center">
      <h1 className="font-display text-2xl font-bold">Category not found</h1>
      <Button className="mt-5" asChild><Link to="/categories">Browse all categories</Link></Button>
    </div>
  ),
});

function CategoryPage() {
  const { slug } = Route.useParams();
  const { data: category } = useSuspenseQuery(categoryQuery(slug));
  const { data, isPending } = useQuery(productsQuery({ category: slug, pageSize: 48 }));
  const { data: categories } = useQuery(categoriesQuery());
  const products = data?.items ?? [];

  if (!category) return null;

  return (
    <div className="container-page py-10">
      <nav className="mb-5 text-xs text-muted-foreground">
        <Link to="/" className="hover:text-foreground">Home</Link> / <Link to="/categories" className="hover:text-foreground">Categories</Link> /{" "}
        <span className="text-foreground">{category.name}</span>
      </nav>
      <SectionHeading title={category.name} subtitle={category.blurb} />
      {isPending ? (
        <ProductGridSkeleton count={8} />
      ) : products.length === 0 ? (
        <EmptyCatalogue title={`${category.name} listings coming soon`} />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {products.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      )}

      {data && data.total > products.length && (
        <div className="mt-8 text-center">
          <Button variant="outline" asChild>
            <Link to="/shop" search={{ category: slug }}>See all {data.total} parts</Link>
          </Button>
        </div>
      )}

      <div className="mt-12">
        <h2 className="mb-4 font-display text-lg font-bold">Other categories</h2>
        <div className="hide-scrollbar flex gap-2 overflow-x-auto">
          {(categories ?? []).filter((c) => c.slug !== category.slug).map((c) => (
            <Link key={c.slug} to="/category/$slug" params={{ slug: c.slug }} className="shrink-0 rounded-full border border-border bg-card px-4 py-2 text-sm hover:border-primary">
              {c.name}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
