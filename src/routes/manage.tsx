import { createFileRoute, Link, Outlet, redirect, useRouter, useRouterState } from "@tanstack/react-router";
import { AlertTriangle, Banknote, BellRing, Bike, Boxes, Briefcase, CalendarCheck, ChevronDown, Images, FileSpreadsheet, Globe, LayoutDashboard, LogOut, PackageSearch, PhoneCall, QrCode, Receipt, Settings, ShieldCheck, Star, Store, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { staffSession } from "@/lib/staff.functions";
import { can, capabilityForManagePath, ROLE_LABEL, type StaffCapability, type StaffRole } from "@/lib/staff-permissions";

export const Route = createFileRoute("/manage")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    // The server can be briefly unreachable (reloads, flaky mobile data); retry before giving up.
    let session: Awaited<ReturnType<typeof staffSession>> | null = null;
    for (let attempt = 0; attempt < 3 && !session; attempt++) {
      try {
        session = await staffSession();
      } catch {
        await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
      }
    }
    if (!session) throw new Error("Could not reach the server. Check your connection and try again.");
    if (!session.signedIn) throw redirect({ to: "/manage-login" });
    const capability = capabilityForManagePath(location.pathname);
    if (!can(session.role, capability)) throw redirect({ to: "/manage", search: { denied: "1" } });
    return { staff: session };
  },
  errorComponent: ({ error, reset }) => (
    <div className="container-page py-16 text-center">
      <h1 className="font-display text-xl font-bold">Manager panel couldn't load</h1>
      <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
      <Button className="mt-4" onClick={() => { reset(); window.location.reload(); }}>Try again</Button>
    </div>
  ),
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

const NAV: { to: keyof typeof import("@/lib/staff-permissions").MANAGE_ROUTE_CAPABILITY; label: string; icon: typeof LayoutDashboard; exact: boolean; capability: StaffCapability; group: string }[] = [
  { to: "/manage", label: "Overview", icon: LayoutDashboard, exact: true, capability: "operations", group: "Work" },
  { to: "/manage/orders", label: "Orders", icon: Receipt, exact: false, capability: "operations", group: "Work" },
  { to: "/manage/enquiries", label: "Enquiries", icon: PhoneCall, exact: false, capability: "operations", group: "Work" },
  { to: "/manage/reviews", label: "Reviews", icon: Star, exact: false, capability: "operations", group: "Work" },
  { to: "/manage/bookings", label: "Bookings & Service", icon: CalendarCheck, exact: false, capability: "operations", group: "Work" },
  { to: "/manage/customers", label: "Customers", icon: Users, exact: false, capability: "operations", group: "Work" },
  { to: "/manage/all-products", label: "All Products", icon: PackageSearch, exact: false, capability: "operations", group: "Work" },
  { to: "/manage/counter-sales", label: "Counter Sales", icon: Banknote, exact: false, capability: "counter-sales", group: "Work" },
  { to: "/manage/vendors", label: "Vendor Payments", icon: QrCode, exact: false, capability: "vendor-finance", group: "Work" },
  { to: "/manage/catalogue", label: "Products & Stock", icon: Boxes, exact: false, capability: "catalogue", group: "Manage" },
  { to: "/manage/import", label: "CSV Price List", icon: FileSpreadsheet, exact: false, capability: "catalogue", group: "Manage" },
  { to: "/manage/scooters", label: "Vehicle Catalogue", icon: Bike, exact: false, capability: "catalogue", group: "Manage" },
  { to: "/manage/trade", label: "Trade & Credit", icon: Briefcase, exact: false, capability: "trade", group: "Manage" },
  { to: "/manage/home", label: "Home Banners", icon: Images, exact: false, capability: "content", group: "Manage" },
  { to: "/manage/about", label: "About Gallery", icon: Images, exact: false, capability: "content", group: "Manage" },
  { to: "/manage/summary", label: "Reports", icon: BellRing, exact: false, capability: "reports", group: "Insights" },
  { to: "/manage/domain", label: "Domain Health", icon: Globe, exact: false, capability: "settings", group: "Owner" },
  { to: "/manage/settings", label: "Site Settings", icon: Settings, exact: false, capability: "settings", group: "Owner" },
  { to: "/manage/brand-catalogue", label: "Brand Catalogue", icon: FileSpreadsheet, exact: false, capability: "settings", group: "Owner" },
  { to: "/manage/staff", label: "Staff Access", icon: ShieldCheck, exact: false, capability: "staff.manage", group: "System" },
] as const;

function ManageLayout() {
  const router = useRouter();
  const { staff } = Route.useRouteContext();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const denied = useRouterState({ select: (s) => new URLSearchParams(s.location.searchStr).get("denied") === "1" });
  const role = staff.role as StaffRole;
  const visibleNav = NAV.filter((item) => can(role, item.capability));
  const active = visibleNav.find((item) => item.exact ? pathname === item.to : pathname.startsWith(item.to)) ?? visibleNav[0];
  const groups = [...new Set(visibleNav.map((item) => item.group))];

  return (
    <div className="container-page py-6 lg:py-8">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-5">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">Manager panel</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Shaw Traders EV · {staff.signedIn ? staff.name : "Staff"}
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild><Button variant="outline" size="sm">{ROLE_LABEL[role]} <ChevronDown className="size-4" /></Button></DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>{staff.signedIn ? staff.email : "Staff account"}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild><Link to="/"><Store className="size-4" /> View storefront</Link></DropdownMenuItem>
            <DropdownMenuItem onSelect={async () => { await supabase.auth.signOut(); await router.navigate({ to: "/manage-login", replace: true }); }}><LogOut className="size-4" /> Sign out</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="grid gap-6 pt-5 lg:grid-cols-[15rem_minmax(0,1fr)]">
        <aside>
          <nav className="hidden space-y-5 lg:block" aria-label="Manager navigation">
            {groups.map((group) => <div key={group}><p className="mb-1.5 px-3 text-xs font-semibold uppercase text-muted-foreground">{group}</p><div className="grid gap-1">{visibleNav.filter((n) => n.group === group).map((n) => <Link key={n.to} to={n.to} activeOptions={{ exact: n.exact }} activeProps={{ className: "bg-muted text-foreground" }} className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"><n.icon className="size-4" />{n.label}</Link>)}</div></div>)}
          </nav>
          <DropdownMenu>
            <DropdownMenuTrigger asChild><Button variant="outline" className="w-full justify-between lg:hidden">{active?.label ?? "Manager menu"}<ChevronDown className="size-4" /></Button></DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-[min(22rem,calc(100vw-2rem))]">{visibleNav.map((n) => <DropdownMenuItem key={n.to} asChild><Link to={n.to}><n.icon className="size-4" />{n.label}</Link></DropdownMenuItem>)}</DropdownMenuContent>
          </DropdownMenu>
        </aside>
        <div className="min-w-0">
          {denied && <div className="mb-4 flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm"><AlertTriangle className="size-4 text-destructive" />Your role does not allow that section.</div>}
          <Outlet />
        </div>
      </div>
    </div>
  );
}
