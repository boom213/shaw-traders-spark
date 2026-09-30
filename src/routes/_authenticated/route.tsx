import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { customerShoppingPath } from "@/lib/customer-shopping-access";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      const next = customerShoppingPath(location.href) ? location.href : undefined;
      throw redirect({ to: "/account", search: next ? { next } : {} });
    }
    return { user: data.user };
  },
  component: () => <Outlet />,
});