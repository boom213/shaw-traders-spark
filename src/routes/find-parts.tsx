import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { FindPartsWidget } from "@/components/site/FindPartsWidget";
import { CategoryGrid } from "@/components/site/CategoryGrid";
import { Button } from "@/components/ui/button";
import { SparkCharge } from "@/components/site/SparkLoaders";
import { BUSINESS, whatsappLink } from "@/lib/catalog";
import { categoriesQuery, vehicleTreeQuery } from "@/lib/queries";
import { staffSession } from "@/lib/staff.functions";

export const Route = createFileRoute("/find-parts")({
  head: () => ({
    meta: [
      { title: "Page Not Found — Shaw Traders EV" },
      { name: "description", content: "The requested page is not publicly available." },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Page Not Found — Shaw Traders EV" },
      { property: "og:description", content: "The requested page is not publicly available." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),

  component: FindPartsPage,
});

function FindPartsPage() {
  const getStaffSession = useServerFn(staffSession);
  const { data: staff, isPending } = useQuery({
    queryKey: ["find-parts-staff-session"],
    queryFn: () => getStaffSession(),
    retry: false,
  });

  if (isPending) {
    return <div className="container-page"><SparkCharge compact label="Checking access…" /></div>;
  }

  if (!staff?.signedIn) {
    return (
      <section className="flex min-h-[60vh] items-center justify-center bg-background px-4">
        <div className="max-w-md text-center">
          <h1 className="text-7xl font-bold text-foreground">404</h1>
          <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
          <p className="mt-2 text-sm text-muted-foreground">The page you're looking for doesn't exist or has been moved.</p>
          <Button asChild className="mt-6">
            <Link to="/">Go home</Link>
          </Button>
        </div>
      </section>
    );
  }

  return (
    <div className="container mx-auto space-y-8 px-4 py-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold md:text-3xl">Find Parts for Your EV</h1>
        <p className="text-sm text-muted-foreground">Pick your vehicle to narrow the catalogue, or send us the details and we will confirm the right fit.</p>
      </header>

      <FindPartsWidget />

      <div className="rounded-2xl border border-border bg-surface p-5">
        <h2 className="text-lg font-semibold">Not sure which part fits?</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Send a photo of the old part along with your vehicle brand, model and year. Our team at {BUSINESS.address} will confirm availability and price.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button asChild>
            <a href={whatsappLink("Hi Shaw Traders EV, I need help finding a part for my EV.")} target="_blank" rel="noreferrer">
              Ask on WhatsApp
            </a>
          </Button>
          <Button asChild variant="outline">
            <a href={`tel:${BUSINESS.phone}`}>Call {BUSINESS.phone}</a>
          </Button>
        </div>
      </div>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Browse by category</h2>
        <CategoryGrid />
      </section>
    </div>
  );
}
