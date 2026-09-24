import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  BatteryCharging,
  Cable,
  CircleDot,
  Cog,
  Cpu,
  Disc3,
  Footprints,
  Lightbulb,
  Lock,
  Package,
  PlugZap,
  Shield,
  Waves,
  Zap,
} from "lucide-react";
import { categoriesQuery } from "@/lib/queries";

export const CATEGORY_ICONS: Record<string, typeof Zap> = {
  "ev-batteries": BatteryCharging,
  chargers: PlugZap,
  motors: Cog,
  controllers: Cpu,
  "body-parts": Shield,
  "brake-parts": Disc3,
  "wheels-tyres": CircleDot,
  suspension: Waves,
  lighting: Lightbulb,
  footrests: Footprints,
  "locks-latches": Lock,
  "electrical-parts": Zap,
  "cables-wiring": Cable,
  accessories: Package,
};

export function CategoryGrid({ limit }: { limit?: number }) {
  const { data, isPending } = useQuery(categoriesQuery());
  const list = (data ?? []).slice(0, limit ?? undefined);

  if (isPending) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {Array.from({ length: limit ?? 10 }).map((_, i) => (
          <div key={i} className="h-40 animate-pulse rounded-2xl bg-muted" />
        ))}
      </div>
    );
  }

  if (list.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-border bg-surface p-8 text-center text-sm text-muted-foreground">
        Categories are being set up. Please check back shortly.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {list.map((c) => {
        const Icon = CATEGORY_ICONS[c.slug] ?? Package;
        return (
          <Link
            key={c.slug}
            to="/category/$slug"
            params={{ slug: c.slug }}
            className="card-lift group flex flex-col gap-3 rounded-2xl border border-border bg-card p-4"
          >
            <span className="grid size-11 place-items-center rounded-xl border border-border text-foreground transition-colors group-hover:border-primary group-hover:text-primary">
              <Icon className="size-5" strokeWidth={1.5} />
            </span>
            <span className="mt-auto">
              <span className="block text-sm font-semibold leading-snug">{c.name}</span>
              <span className="block text-xs text-muted-foreground">{c.blurb}</span>
            </span>
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary">
              {c.productCount ? `${c.productCount} parts` : "Shop Now"}{" "}
              <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
            </span>
          </Link>
        );
      })}
    </div>
  );
}
