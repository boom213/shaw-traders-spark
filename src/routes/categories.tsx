import { createFileRoute } from "@tanstack/react-router";
import { CategoryGrid } from "@/components/site/CategoryGrid";
import { SectionHeading } from "@/components/site/Empty";
import { breadcrumbLd, canonical } from "@/lib/catalog";

export const Route = createFileRoute("/categories")({
  head: () => ({
    meta: [
      { title: "Part Categories" },
      { name: "description", content: "Browse every EV part category at Shaw Traders EV: batteries, chargers, motors, controllers, body parts, brakes, wheels, lighting and more." },
      { property: "og:title", content: "All EV Part Categories — Shaw Traders EV" },
      { property: "og:description", content: "Fourteen categories of EV spare parts and accessories for scooters, e-bikes and e-rickshaws." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: canonical("/categories") },
    ],
    links: [{ rel: "canonical", href: canonical("/categories") }],
    scripts: [breadcrumbLd([{ name: "Part Categories", path: "/categories" }])],
  }),

  component: () => (
    <div className="container-page py-10">
      <SectionHeading as="h1" title="All Categories" subtitle="Parts and accessories for electric scooters, e-bikes and e-rickshaws." />
      <CategoryGrid />
    </div>
  ),
});
