import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Heart, Menu, MessageCircle, Search, ShoppingCart, User, Zap } from "lucide-react";
import { useState } from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { SearchBox } from "@/components/site/SearchBox";
import { useStore } from "@/hooks/useStore";
import { BUSINESS, NAV_CATEGORIES, whatsappLink } from "@/lib/catalog";
import { categoriesQuery } from "@/lib/queries";

function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2.5">
      <span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground">
        <Zap className="size-5" />
      </span>
      <span className="leading-tight">
        <span className="block font-display text-base font-bold tracking-tight">Shaw Traders EV</span>
        <span className="hidden text-[11px] text-muted-foreground sm:block">{BUSINESS.tagline}</span>
      </span>
    </Link>
  );
}

export function Header() {
  const { lists } = useStore();
  const cartCount = lists.cart.reduce((n, c) => n + c.qty, 0);
  const { data: categories } = useQuery(categoriesQuery());
  const navCategories = NAV_CATEGORIES.map((slug) => (categories ?? []).find((c) => c.slug === slug)).filter(
    (c): c is NonNullable<typeof c> => Boolean(c),
  );
  const [mobileSearch, setMobileSearch] = useState(false);
  const [menu, setMenu] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
      <div className="container-page flex h-16 items-center gap-3">
        <Sheet open={menu} onOpenChange={setMenu}>
          <SheetTrigger className="-ml-1 grid size-9 place-items-center rounded-lg hover:bg-muted lg:hidden" aria-label="Open menu">
            <Menu className="size-5" />
          </SheetTrigger>
          <SheetContent side="left" className="w-[85vw] max-w-sm overflow-y-auto p-6">
            <div className="mb-6">
              <Logo />
            </div>
            <nav className="grid gap-1 text-sm">
              {[
                { to: "/shop", label: "Shop All Products" },
                { to: "/offers", label: "Offers" },
                { to: "/find-parts", label: "Find Parts for Your EV" },
                { to: "/bulk", label: "Dealer & Bulk Orders" },
                { to: "/track", label: "Track Order" },
                { to: "/account", label: "My Account" },
                { to: "/about", label: "About" },
                { to: "/contact", label: "Contact" },
              ].map((l) => (
                <Link key={l.to} to={l.to} onClick={() => setMenu(false)} className="rounded-lg px-3 py-2.5 font-medium hover:bg-muted">
                  {l.label}
                </Link>
              ))}
            </nav>
            <p className="mt-6 mb-2 px-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Categories</p>
            <nav className="grid gap-0.5 text-sm">
              {(categories ?? []).map((c) => (
                <Link
                  key={c.slug}
                  to="/category/$slug"
                  params={{ slug: c.slug }}
                  onClick={() => setMenu(false)}
                  className="rounded-lg px-3 py-2 text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  {c.name}
                </Link>
              ))}
            </nav>
          </SheetContent>
        </Sheet>

        <Logo />

        <div className="mx-auto hidden max-w-xl flex-1 lg:block">
          <SearchBox />
        </div>

        <div className="ml-auto flex items-center gap-1">
          <button
            onClick={() => setMobileSearch((v) => !v)}
            className="grid size-9 place-items-center rounded-lg hover:bg-muted lg:hidden"
            aria-label="Search"
          >
            <Search className="size-5" />
          </button>
          <Link to="/account" className="hidden size-9 place-items-center rounded-lg hover:bg-muted sm:grid" aria-label="Account">
            <User className="size-5" />
          </Link>
          <Link to="/account" hash="wishlist" className="hidden size-9 place-items-center rounded-lg hover:bg-muted sm:grid" aria-label="Wishlist">
            <Heart className="size-5" />
          </Link>
          <a
            href={whatsappLink(`Hello ${BUSINESS.name}, I have a question about EV parts.`)}
            target="_blank"
            rel="noreferrer"
            className="hidden size-9 place-items-center rounded-lg text-whatsapp hover:bg-muted sm:grid"
            aria-label="WhatsApp us"
          >
            <MessageCircle className="size-5" />
          </a>
          <Link to="/cart" className="relative grid size-9 place-items-center rounded-lg hover:bg-muted" aria-label="Cart">
            <ShoppingCart className="size-5" />
            {cartCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 grid min-w-4.5 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                {cartCount}
              </span>
            )}
          </Link>
        </div>
      </div>

      {mobileSearch && (
        <div className="container-page pb-3 lg:hidden">
          <SearchBox autoFocus />
        </div>
      )}

      <nav className="border-t border-border bg-surface">
        <div className="container-page hide-scrollbar flex gap-1 overflow-x-auto py-2">
          {navCategories.map((c) => (
            <Link
              key={c.slug}
              to="/category/$slug"
              params={{ slug: c.slug }}
              className="shrink-0 rounded-full px-3.5 py-1.5 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
              activeProps={{ className: "shrink-0 rounded-full px-3.5 py-1.5 text-[13px] font-medium bg-background text-foreground shadow-[var(--shadow-card)]" }}
            >
              {c.name}
            </Link>
          ))}
        </div>
      </nav>
    </header>
  );
}
