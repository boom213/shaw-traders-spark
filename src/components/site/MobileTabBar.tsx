import { Link } from "@tanstack/react-router";
import { Grid2x2, Home, Search, ShoppingCart, User } from "lucide-react";
import { useStore } from "@/hooks/useStore";
import { useT, type TranslationKey } from "@/lib/i18n";

const items = [
  { to: "/", key: "nav.home" as TranslationKey, icon: Home },
  { to: "/categories", key: "nav.categories" as TranslationKey, icon: Grid2x2 },
  { to: "/shop", key: "nav.search" as TranslationKey, icon: Search },
  { to: "/cart", key: "nav.cart" as TranslationKey, icon: ShoppingCart },
  { to: "/account", key: "nav.account" as TranslationKey, icon: User },
] as const;

export function MobileTabBar() {
  const t = useT();
  const { lists } = useStore();
  const cartCount = lists.cart.reduce((n, c) => n + c.qty, 0);

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
      <ul className="grid grid-cols-5">
        {items.map(({ to, key, icon: Icon }) => (
          <li key={to}>
            <Link
              to={to}
              className="relative flex flex-col items-center gap-1 py-2.5 text-[11px] text-muted-foreground"
              activeOptions={{ exact: to === "/" }}
              activeProps={{ className: "relative flex flex-col items-center gap-1 py-2.5 text-[11px] text-primary font-semibold" }}
            >
              <Icon className="size-5" aria-hidden="true" />
              {t(key)}
              {key === "nav.cart" && cartCount > 0 && (
                <span className="absolute right-1/4 top-1 grid min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                  {cartCount}
                </span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
