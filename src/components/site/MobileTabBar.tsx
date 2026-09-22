import { Link } from "@tanstack/react-router";
import { Grid2x2, Home, Search, ShoppingCart, User } from "lucide-react";
import { useStore } from "@/hooks/useStore";

const items = [
  { to: "/", label: "Home", icon: Home },
  { to: "/categories", label: "Categories", icon: Grid2x2 },
  { to: "/shop", label: "Search", icon: Search },
  { to: "/cart", label: "Cart", icon: ShoppingCart },
  { to: "/account", label: "Account", icon: User },
] as const;

export function MobileTabBar() {
  const { state } = useStore();
  const cartCount = state.cart.reduce((n, c) => n + c.qty, 0);

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
      <ul className="grid grid-cols-5">
        {items.map(({ to, label, icon: Icon }) => (
          <li key={label}>
            <Link
              to={to}
              className="relative flex flex-col items-center gap-1 py-2.5 text-[11px] text-muted-foreground"
              activeOptions={{ exact: to === "/" }}
              activeProps={{ className: "relative flex flex-col items-center gap-1 py-2.5 text-[11px] text-primary font-semibold" }}
            >
              <Icon className="size-5" />
              {label}
              {label === "Cart" && cartCount > 0 && (
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
