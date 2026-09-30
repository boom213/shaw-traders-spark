import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Home, ShoppingBag, ShoppingCart, User } from "lucide-react";
import { useStore } from "@/hooks/useStore";
import { useSiteOrdering } from "@/hooks/useOrderingMode";
import { useT, type TranslationKey } from "@/lib/i18n";
import { AccountMenu } from "@/components/site/AccountMenu";
import { staffSession } from "@/lib/staff.functions";

const cartItem = { to: "/cart", key: "nav.cart" as TranslationKey, icon: ShoppingCart } as const;
const accountItem = { to: "/account", key: "nav.account" as TranslationKey, icon: User } as const;

export function MobileTabBar() {
  const t = useT();
  const { lists, user } = useStore();
  const { mode } = useSiteOrdering();
  const { data: staff } = useQuery({ queryKey: ["account-staff-session", user?.id], queryFn: () => staffSession(), enabled: Boolean(user), retry: false });
  const isStaff = Boolean(staff?.signedIn);
  const cartCount = lists.cart.reduce((n, c) => n + c.qty, 0);
  const items = [
    { to: "/", key: "nav.home" as TranslationKey, icon: Home },
    ...(!isStaff ? [{ to: "/shop" as const, key: "nav.shop" as TranslationKey, shortLabel: "Products", icon: ShoppingBag }] : []),
    ...(mode === "full" && !isStaff ? [cartItem] : []),
    accountItem,
  ];
  const gridColumns = items.length === 4 ? "grid-cols-4" : items.length === 3 ? "grid-cols-3" : "grid-cols-2";

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden" aria-label="Mobile navigation">
      <ul className={`grid ${gridColumns}`}>
        {items.map((item) => {
          const { to, key, icon: Icon } = item;
          const label = "shortLabel" in item ? item.shortLabel : t(key);
          return (
          <li key={to}>
            {to === "/account" ? <AccountMenu variant="tab" /> : <Link
              to={to}
              aria-label={label}
              className="relative flex h-16 min-w-0 flex-col items-center justify-center gap-1 px-1 text-[10px] font-medium leading-none text-muted-foreground sm:text-xs"
              activeOptions={{ exact: to === "/" }}
              activeProps={{ className: "relative flex h-16 min-w-0 flex-col items-center justify-center gap-1 px-1 text-[10px] font-semibold leading-none text-primary sm:text-xs" }}
            >
              <Icon className="size-5 shrink-0" aria-hidden="true" />
              <span className="max-w-full truncate">{label}</span>
              {key === "nav.cart" && cartCount > 0 && (
                <span className="absolute right-1/4 top-1 grid min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                  {cartCount}
                </span>
              )}
            </Link>}
          </li>
          );
        })}
      </ul>
    </nav>
  );
}
