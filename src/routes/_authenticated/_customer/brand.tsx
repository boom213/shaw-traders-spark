import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, ShoppingCart, Store, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HeroCarousel } from "@/components/home/HeroCarousel";
import { BrochureDownloadDialog } from "@/components/site/BrochureDownloadDialog";
import { useStore } from "@/hooks/useStore";
import { breadcrumbLd, canonical } from "@/lib/catalog";
import type { HeroSlide } from "@/lib/catalog.functions";
import phBattery from "@/assets/ph-battery.jpg";
import phBody from "@/assets/ph-body.jpg";
import phMotor from "@/assets/ph-motor.jpg";
import phElectrical from "@/assets/ph-electrical.jpg";

const TITLE = "ST Brand Spare Parts — Shaw Traders Own Brand";
const DESC =
  "Shop the ST (Shaw Traders) own-brand range of electric scooter spare parts and batteries. Retail sign-in, wholesale trade accounts and a downloadable catalogue.";

export const Route = createFileRoute("/brand")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { property: "og:url", content: canonical("/brand") },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: canonical("/brand") }],
    scripts: [breadcrumbLd([{ name: "ST Brand", path: "/brand" }])],
  }),
  component: BrandPage,
});

// Placeholder category photography until real ST-brand renders are supplied.
const SLIDES = [
  { id: "st-1", heading: "All ST Brand Spare Parts", subline: "Genuine own-brand parts for electric scooters, stocked in Bud Bud.", imageUrl: phBody, buttonLabel: "Shop parts", buttonHref: "/shop" },
  { id: "st-2", heading: "ST Batteries", subline: "Dependable power for everyday rides.", imageUrl: phBattery, buttonLabel: "View batteries", buttonHref: "/category/ev-batteries" },
  { id: "st-3", heading: "Motors & electricals", subline: "Built to keep your scooter on the road.", imageUrl: phMotor, buttonLabel: "Shop parts", buttonHref: "/shop" },
] as unknown as HeroSlide[];

const TILES = [
  { label: "Scooty Parts", sub: "Body, brakes, electricals and more", img: phElectrical, to: "/shop" as const },
  { label: "Battery", sub: "EV batteries for every model", img: phBattery, to: "/category/$slug" as const, slug: "ev-batteries" },
];

function BrandPage() {
  const { lists } = useStore();
  const count = lists.cart.reduce((n, l) => n + l.qty, 0);

  return (
    <div className="mx-auto max-w-7xl space-y-10 px-4 py-6 sm:py-10">
      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="ST — Shaw Traders brand mark" width={64} height={64} className="size-16 object-contain" />
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">Our own brand</p>
            <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">ST by Shaw Traders</h1>
          </div>
        </div>
        <HeroCarousel slides={SLIDES} />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
          {TILES.map((t) => {
            const inner = (
              <>
                <div className="relative aspect-[16/9] w-full bg-surface">
                  <img src={t.img} alt={t.label} width={800} height={450} loading="lazy" decoding="async" className="absolute inset-0 size-full object-cover" />
                </div>
                <div className="flex items-center justify-between gap-3 p-4">
                  <span>
                    <span className="block font-display text-lg font-semibold">{t.label}</span>
                    <span className="block text-sm text-muted-foreground">{t.sub}</span>
                  </span>
                  <ArrowRight className="size-5 shrink-0 text-primary transition-transform group-hover:translate-x-0.5" />
                </div>
              </>
            );
            const cls = "card-lift group block overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-card)]";
            return t.slug ? (
              <Link key={t.label} to="/category/$slug" params={{ slug: t.slug }} className={cls}>{inner}</Link>
            ) : (
              <Link key={t.label} to="/shop" className={cls}>{inner}</Link>
            );
          })}
        </div>

        <div className="grid gap-4">
          <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-card)]">
            <span className="grid size-12 place-items-center rounded-xl bg-accent text-accent-foreground"><UserRound className="size-6" /></span>
            <h2 className="font-display text-xl font-semibold">Retailer Login</h2>
            <p className="text-sm text-muted-foreground">Sign in with your phone number and shop directly at retail prices.</p>
            <Button size="lg" asChild className="mt-auto w-full sm:w-auto"><Link to="/account">Sign in & shop</Link></Button>
          </div>
          <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-card)]">
            <span className="grid size-12 place-items-center rounded-xl bg-accent text-accent-foreground"><Store className="size-6" /></span>
            <h2 className="font-display text-xl font-semibold">Wholesaler / Dealer Login</h2>
            <p className="text-sm text-muted-foreground">Apply for a trade account with your GST details to unlock wholesale pricing.</p>
            <Button size="lg" variant="outline" asChild className="mt-auto w-full sm:w-auto"><Link to="/trade">Apply for trade account</Link></Button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <Button size="lg" asChild className="h-14 text-base">
          <Link to="/cart"><ShoppingCart className="size-5" /> Cart{count > 0 ? ` (${count})` : ""}</Link>
        </Button>
        {/* Super admins upload the PDF from Manager panel → ST Catalogue. */}
        <BrochureDownloadDialog className="h-14 text-base" label="Download Brochure" />
      </section>
    </div>
  );
}
