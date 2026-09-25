import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { ChevronDown, User } from "lucide-react";
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
import { useQuery } from "@tanstack/react-query";

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

  async function signOut() {
    await supabase.auth.signOut();
    qc.invalidateQueries();
    toast.success("Signed out");
    navigate({ to: "/" });
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
        className={variant === "tab" ? "w-64 [&_[role=menuitem]]:py-2.5" : "w-60"}
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
            <DropdownMenuItem asChild>
              <Link to="/account">My Account</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/account" hash="wishlist">Wishlist</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/track">Track an Order</Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {isTrade ? (
              <>
                <DropdownMenuItem asChild>
                  <Link to="/trade">Trade Dashboard</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/trade/pad">Bulk Order Pad</Link>
                </DropdownMenuItem>
              </>
            ) : pending ? (
              <DropdownMenuItem asChild>
                <Link to="/trade">Trade Application: Pending</Link>
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem asChild>
                <Link to="/trade">Register for Trade & Wholesale Account</Link>
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            {staff?.signedIn && (
              <DropdownMenuItem asChild>
                <Link to="/manage">Open Manager Panel</Link>
              </DropdownMenuItem>
            )}
            {staff?.signedIn && <DropdownMenuSeparator />}
            <DropdownMenuItem onSelect={() => void signOut()}>Sign Out</DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
