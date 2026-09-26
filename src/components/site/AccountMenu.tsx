import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BadgePercent,
  Banknote,
  Bike,
  Boxes,
  BriefcaseBusiness,
  ChevronDown,
  ClipboardList,
  FileSpreadsheet,
  Gauge,
  Heart,
  LayoutDashboard,
  LogOut,
  PackageSearch,
  Settings,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  Tags,
  User,
  Users,
  Wrench,
} from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useStore } from "@/hooks/useStore";
import { useTradeAccount } from "@/hooks/useTrade";
import { supabase } from "@/integrations/supabase/client";
import { staffSession } from "@/lib/staff.functions";
import { can, ROLE_LABEL, type StaffCapability, type StaffRole } from "@/lib/staff-permissions";

const STAFF_LINKS = [
  { to: "/manage", label: "Overview", icon: LayoutDashboard, capability: "operations" },
  { to: "/manage/orders", label: "Orders", icon: ClipboardList, capability: "operations" },
  { to: "/manage/enquiries", label: "Enquiries", icon: PackageSearch, capability: "operations" },
  { to: "/manage/bookings", label: "Bookings & service", icon: Wrench, capability: "operations" },
  { to: "/manage/customers", label: "Customers", icon: Users, capability: "operations" },
  { to: "/manage/all-products", label: "All products", icon: ShoppingBag, capability: "operations" },
  { to: "/manage/counter-sales", label: "Counter sales", icon: Banknote, capability: "counter-sales" },
  { to: "/manage/catalogue", label: "Products & stock", icon: Boxes, capability: "catalogue" },
  { to: "/manage/scooters", label: "Vehicle catalogue", icon: Bike, capability: "catalogue" },
  { to: "/manage/trade", label: "Trade & credit", icon: BriefcaseBusiness, capability: "trade" },
  { to: "/manage/summary", label: "Reports", icon: Gauge, capability: "reports" },
  { to: "/manage/settings", label: "Site Settings", icon: Settings, capability: "settings" },
  { to: "/manage/brand-catalogue", label: "Brand catalogue", icon: FileSpreadsheet, capability: "settings" },
  { to: "/manage/staff", label: "Staff access", icon: ShieldCheck, capability: "staff.manage" },
] as const satisfies ReadonlyArray<{ to: string; label: string; icon: typeof User; capability: StaffCapability }>;

export function AccountMenu({ variant = "header" }: { variant?: "header" | "tab" }) {
  const { user } = useStore();
  const { account, isTrade } = useTradeAccount();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const meta = (user?.user_metadata ?? {}) as Record<string, string | undefined>;
  const first = (meta.full_name || meta.name || "").split(" ")[0];
  const label = user ? first || "Account" : "Sign In / Register";
  const tabLabel = user ? first || "Account" : "Account";
  const pending = !isTrade && account?.application != null;
  const { data: staff } = useQuery({ queryKey: ["account-staff-session", user?.id], queryFn: () => staffSession(), enabled: Boolean(user), retry: false });
  const staffRole = staff?.signedIn ? (staff.role as StaffRole) : null;
  const staffLinks = staffRole ? STAFF_LINKS.filter((item) => can(staffRole, item.capability)) : [];

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    toast.success("Signed out");
    navigate({ to: "/", replace: true });
  }

  return (
    <DropdownMenu>
      {variant === "tab" ? (
        <DropdownMenuTrigger
          className="flex h-16 w-full min-w-0 flex-col items-center justify-center gap-1 px-1 text-[10px] font-medium leading-none text-muted-foreground data-[state=open]:font-semibold data-[state=open]:text-primary sm:text-xs"
          aria-label={user ? `${label} account menu` : "Sign in or register"}
        >
          <User className="size-5 shrink-0" aria-hidden="true" />
          <span className="max-w-full truncate">{tabLabel}</span>
        </DropdownMenuTrigger>
      ) : (
        <DropdownMenuTrigger
          className="hidden h-10 items-center gap-1.5 rounded-lg px-2.5 text-sm font-medium hover:bg-muted sm:flex"
          aria-label="Account menu"
        >
          <User className="size-5" />
          <span className="max-w-24 truncate">{label}</span>
          <ChevronDown className="size-3.5 text-muted-foreground" />
        </DropdownMenuTrigger>
      )}
      <DropdownMenuContent
        align="end"
        side={variant === "tab" ? "top" : "bottom"}
        sideOffset={variant === "tab" ? 10 : 4}
        className={`${variant === "tab" ? "w-[min(21rem,calc(100vw-1rem))]" : "w-72"} max-h-[min(38rem,calc(100vh-6rem))] overflow-y-auto [&_[role=menuitem]]:py-2.5`}
      >
        {!user ? (
          <DropdownMenuItem asChild>
            <Link to="/account">Sign In / Register</Link>
          </DropdownMenuItem>
        ) : (
          <>
            <DropdownMenuLabel className="truncate text-xs font-normal text-muted-foreground">
              {user.email || user.phone || "Signed in"}
            </DropdownMenuLabel>
            <DropdownMenuLabel className="pb-1 text-[11px] font-semibold uppercase text-muted-foreground">My account</DropdownMenuLabel>
            <DropdownMenuItem asChild>
              <Link to="/account" hash="details"><User className="size-4" /> Profile & details</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/account" hash="orders"><ClipboardList className="size-4" /> My orders</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/account" hash="wishlist"><Heart className="size-4" /> Wishlist</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/track"><PackageSearch className="size-4" /> Track an order</Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="pb-1 text-[11px] font-semibold uppercase text-muted-foreground">Shopping</DropdownMenuLabel>
            <DropdownMenuItem asChild>
              <Link to="/shop"><ShoppingBag className="size-4" /> All products</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/brand"><Tags className="size-4" /> EV brands</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/scooters"><Bike className="size-4" /> Electric scooters</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/cart"><ShoppingCart className="size-4" /> My cart</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/offers"><BadgePercent className="size-4" /> Offers</Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="pb-1 text-[11px] font-semibold uppercase text-muted-foreground">Trade & wholesale</DropdownMenuLabel>
            {isTrade ? (
              <>
                <DropdownMenuItem asChild>
                  <Link to="/trade"><BriefcaseBusiness className="size-4" /> Trade dashboard</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/trade/pad"><ClipboardList className="size-4" /> Bulk order pad</Link>
                </DropdownMenuItem>
              </>
            ) : pending ? (
              <DropdownMenuItem asChild>
                <Link to="/trade"><BriefcaseBusiness className="size-4" /> Trade application: pending</Link>
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem asChild>
                <Link to="/trade"><BriefcaseBusiness className="size-4" /> Register for a Wholesale Account</Link>
              </DropdownMenuItem>
            )}
            {staffRole && <>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="flex items-center justify-between pb-1 text-[11px] font-semibold uppercase text-muted-foreground">
                <span>Staff workspace</span><span className="normal-case">{ROLE_LABEL[staffRole]}</span>
              </DropdownMenuLabel>
              {staffLinks.map((item) => (
                <DropdownMenuItem key={item.to} asChild>
                  <Link to={item.to}><item.icon className="size-4" /> {item.label}</Link>
                </DropdownMenuItem>
              ))}
            </>}
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => void signOut()}><LogOut className="size-4" /> Sign out</DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
