import { Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Heart, Menu, MessageCircle, Package, ShoppingCart } from "lucide-react";
import { useState } from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { SearchBox } from "@/components/site/SearchBox";
import { LanguageSwitch } from "@/components/site/LanguageSwitch";
import { useT } from "@/lib/i18n";
import { useStore } from "@/hooks/useStore";
import { useSiteOrdering } from "@/hooks/useOrderingMode";
import { BUSINESS, NAV_CATEGORIES, whatsappLink } from "@/lib/catalog";
import { categoriesQuery } from "@/lib/queries";
import { AccountMenu } from "@/components/site/AccountMenu";
import { CATEGORY_ICONS } from "@/components/site/CategoryGrid";

function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2.5">
      <img src="/logo.png" alt="Shaw Traders EV" width={36} height={36} className="size-9 rounded-xl object-contain" />
      <span className="leading-tight">
        <span className="block font-display text-base font-bold tracking-tight">Shaw Traders EV</span>
        <span className="hidden text-[11px] text-muted-foreground sm:block">{BUSINESS.tagline}</span>
      </span>
    </Link>
  );
}

export function Header() {
  const t = useT();
  const { lists } = useStore();
  const cartCount = lists.cart.reduce((n, c) => n + c.qty, 0);
  const { mode: siteMode } = useSiteOrdering();
  const { data: categories } = useSuspenseQuery(categoriesQuery());
  const navCategories = NAV_CATEGORIES.map((slug) => (categories ?? []).find((c) => c.slug === slug)).filter(
    (c): c is NonNullable<typeof c> => Boolean(c),
  );
  const [menu, setMenu] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
      <div className="container-page grid h-16 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 lg:h-[4.5rem] lg:gap-7">
        <Sheet open={menu} onOpenChange={setMenu}>
          <SheetTrigger
            className="-ml-1 grid size-9 place-items-center rounded-lg hover:bg-muted lg:hidden"
            aria-label={t("nav.menu")}
          >
            <Menu className="size-5" />
          </SheetTrigger>
          <SheetContent side="left" className="w-[85vw] max-w-sm overflow-y-auto p-6">
            <div className="mb-6">
              <Logo />
            </div>

            <nav className="grid gap-1 text-sm">
              {[
                { to: "/shop", label: t("nav.shop") },
                { to: "/find-parts", label: t("nav.findParts") },
                { to: "/trade", label: "Trade Account" },
                { to: "/bulk", label: t("nav.bulk") },
                { to: "/service", label: "Service" },
                { to: "/track", label: t("nav.track") },
                { to: "/about", label: t("nav.about") },
                { to: "/contact", label: t("nav.contact") },
              ].map((l) => (
                <Link
                  key={l.to}
                  to={l.to}
                  onClick={() => setMenu(false)}
                  className="rounded-lg px-3 py-2.5 font-medium hover:bg-muted"
                >
                  {l.label}
                </Link>
              ))}
            </nav>
            {(categories ?? []).length > 0 && <><p className="mt-6 mb-2 px-3 text-xs font-semibold uppercase text-muted-foreground">
              {t("nav.categories")}
            </p>
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
            </nav></>}
            <LanguageSwitch className="mt-6 px-3" />
          </SheetContent>
        </Sheet>

        <div className="min-w-0">
          <Logo />
        </div>

        <div className="mx-auto hidden w-full max-w-2xl min-w-0 lg:block">
          <SearchBox />
        </div>

        <div className="flex shrink-0 items-center justify-end gap-1">
          <LanguageSwitch className="hidden lg:block" />
          <AccountMenu />
          <Link
            to="/account"
            hash="wishlist"
            className="hidden size-9 place-items-center rounded-lg hover:bg-muted sm:grid"
            aria-label={t("nav.wishlist")}
          >
            <Heart className="size-5" />
          </Link>
          <a
            href={whatsappLink(`Hello ${BUSINESS.name}, I have a question about EV parts.`)}
            target="_blank"
            rel="noreferrer"
            className="hidden size-9 place-items-center rounded-lg text-whatsapp hover:bg-muted sm:grid"
            aria-label={t("nav.whatsapp")}
          >
            <MessageCircle className="size-5" />
          </a>
          {siteMode === "full" && (
            <Link
              to="/cart"
              className="relative grid size-9 place-items-center rounded-lg hover:bg-muted"
              aria-label={t("nav.cart")}
            >
              <ShoppingCart className="size-5" />
              {cartCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 grid min-w-4.5 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                  {cartCount}
                </span>
              )}
            </Link>
          )}
        </div>
      </div>

      <div className="container-page pb-3 lg:hidden">
        <SearchBox />
      </div>

      <nav className="hidden border-t border-border lg:block" aria-label="Store navigation">
        <div className="container-page flex h-11 items-center justify-center gap-4">
          {[
            { to: "/shop", label: "Shop" },
            { to: "/find-parts", label: "Find Parts" },
            { to: "/trade", label: "Trade" },
            { to: "/bulk", label: "Bulk Orders" },
            { to: "/service", label: "Service" },
            { to: "/contact", label: "Contact" },
          ].map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
              activeProps={{ className: "rounded-md bg-muted px-3 py-2 text-sm font-semibold text-foreground" }}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </nav>

      {navCategories.length > 0 && <nav className="border-t border-border bg-surface">
        <div className="container-page hide-scrollbar flex items-center overflow-x-auto py-0 lg:justify-center">
          {navCategories.map((c) => {
            const Icon = CATEGORY_ICONS[c.slug] ?? Package;
            return (
              <Link
                key={c.slug}
                to="/category/$slug"
                params={{ slug: c.slug }}
                className="flex h-11 min-w-[9rem] shrink-0 items-center justify-center gap-2 border-r border-border px-4 text-[13px] font-medium text-muted-foreground transition-colors first:border-l hover:bg-background hover:text-foreground"
                activeProps={{
                  className:
                    "flex h-11 min-w-[9rem] shrink-0 items-center justify-center gap-2 border-x border-border bg-background px-4 text-[13px] font-semibold text-foreground",
                }}
              >
                <Icon className="size-4 text-foreground" strokeWidth={1.7} />
                {c.name}
              </Link>
            );
          })}
        </div>
      </nav>}
    </header>
  );
}
