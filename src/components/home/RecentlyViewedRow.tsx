import { useQuery } from "@tanstack/react-query";
import { SectionHeading } from "@/components/site/Empty";
import { ProductCarousel } from "@/components/home/ProductCarousel";
import { useStore } from "@/hooks/useStore";
import { productsByIdsQuery } from "@/lib/queries";

/** Parts this visitor looked at before, in the order they saw them. */
export function RecentlyViewedRow() {
  const { lists } = useStore();
  const ids = lists.recentlyViewed.slice(0, 12);
  const { data } = useQuery(productsByIdsQuery(ids));

  if (ids.length === 0) return null;
  const items = ids.map((id) => (data ?? []).find((p) => p.id === id)).filter((p): p is NonNullable<typeof p> => Boolean(p));
  if (items.length === 0) return null;

  return (
    <section className="container-page py-4 lg:py-8">
      <SectionHeading title="Recently viewed" subtitle="Pick up where you left off." />
      <ProductCarousel items={items} label="Recently viewed parts" />
    </section>
  );
}
