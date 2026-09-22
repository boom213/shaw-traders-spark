import { Link } from "@tanstack/react-router";
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
import { CATEGORIES } from "@/lib/catalog";

const ICONS: Record<string, typeof Zap> = {
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
  const list = limit ? CATEGORIES.slice(0, limit) : CATEGORIES;
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {list.map((c) => {
        const Icon = ICONS[c.slug] ?? Package;
        return (
          <Link
            key={c.slug}
            to="/category/$slug"
            params={{ slug: c.slug }}
            className="card-lift group flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-card)]"
          >
            <span className="grid size-12 place-items-center rounded-xl bg-accent text-accent-foreground transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
              <Icon className="size-6" />
            </span>
            <span className="mt-auto">
              <span className="block text-sm font-semibold leading-snug">{c.name}</span>
              <span className="block text-xs text-muted-foreground">{c.blurb}</span>
            </span>
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary">
              Shop Now <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
            </span>
          </Link>
        );
      })}
    </div>
  );
}
