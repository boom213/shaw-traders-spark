import { createFileRoute, Link, Outlet, redirect, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Boxes, Globe, LayoutDashboard, LogOut, Receipt, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { isManagerUnlocked, lockManager } from "@/lib/manage.functions";

export const Route = createFileRoute("/manage")({
  beforeLoad: async () => {
    const { unlocked } = await isManagerUnlocked();
    if (!unlocked) throw redirect({ to: "/manage-login" });
  },
  head: () => ({
    meta: [
      { title: "Manager Panel — Shaw Traders EV" },
      { name: "description", content: "Staff panel to manage the Shaw Traders EV catalogue, stock, photos, orders and customers." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Manager Panel — Shaw Traders EV" },
      { property: "og:description", content: "Catalogue, stock, orders and customer management for Shaw Traders EV." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ManageLayout,
});

const NAV = [
  { to: "/manage", label: "Overview", icon: LayoutDashboard, exact: true },
  { to: "/manage/catalogue", label: "Stock & Photos", icon: Boxes, exact: false },
  { to: "/manage/orders", label: "Orders", icon: Receipt, exact: false },
  { to: "/manage/customers", label: "Customers", icon: Users, exact: false },
  { to: "/manage/domain", label: "Domain Health", icon: Globe, exact: false },
] as const;

function ManageLayout() {
  const router = useRouter();
  const lock = useServerFn(lockManager);

  return (
    <div className="container-page py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">Manager panel</h1>
          <p className="mt-1 text-sm text-muted-foreground">Shaw Traders EV · staff only</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={async () => {
            await lock();
            await router.navigate({ to: "/manage-login" });
          }}
        >
          <LogOut className="size-4" /> Sign out
        </Button>
      </div>

      <nav className="mt-5 flex gap-2 overflow-x-auto pb-1">
        {NAV.map((n) => (
          <Link
            key={n.to}
            to={n.to}
            activeOptions={{ exact: n.exact }}
            activeProps={{ className: "bg-primary text-primary-foreground border-primary" }}
            className="inline-flex shrink-0 items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium hover:border-primary"
          >
            <n.icon className="size-4" /> {n.label}
          </Link>
        ))}
      </nav>

      <div className="mt-6">
        <Outlet />
      </div>
    </div>
  );
}
