import { Link } from "@tanstack/react-router";
import { Home, SearchCheck, ShoppingBag, ShoppingCart, User } from "lucide-react";
import { useStore } from "@/hooks/useStore";
import { useSiteOrdering } from "@/hooks/useOrderingMode";
import { useT, type TranslationKey } from "@/lib/i18n";
import { AccountMenu } from "@/components/site/AccountMenu";

const base = [
  { to: "/", key: "nav.home" as TranslationKey, icon: Home },
  { to: "/shop", key: "nav.shop" as TranslationKey, icon: ShoppingBag },
  { to: "/find-parts", key: "nav.findParts" as TranslationKey, icon: SearchCheck },
] as const;

const cartItem = { to: "/cart", key: "nav.cart" as TranslationKey, icon: ShoppingCart } as const;
const accountItem = { to: "/account", key: "nav.account" as TranslationKey, icon: User } as const;

export function MobileTabBar() {
  const t = useT();
  const { lists } = useStore();
  const { mode } = useSiteOrdering();
  const cartCount = lists.cart.reduce((n, c) => n + c.qty, 0);
  const items = mode === "full" ? [...base, cartItem, accountItem] : [...base, accountItem];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden" aria-label="Mobile navigation">
      <ul className={mode === "full" ? "grid grid-cols-5" : "grid grid-cols-4"}>
        {items.map(({ to, key, icon: Icon }) => (
          <li key={to}>
            {to === "/account" ? <AccountMenu variant="tab" /> : <Link
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
            </Link>}
          </li>
        ))}
      </ul>
    </nav>
  );
}
