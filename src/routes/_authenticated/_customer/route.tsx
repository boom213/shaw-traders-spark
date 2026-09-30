import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { customerPageAccess } from "@/lib/customer-shopping-access.functions";

export const Route = createFileRoute("/_authenticated/_customer")({
  beforeLoad: async () => {
    const access = await customerPageAccess();
    if (access.kind === "guest") throw redirect({ to: "/account" });
    if (access.kind === "staff") throw redirect({ to: access.fallback });
    return { customer: true as const };
  },
  component: () => <Outlet />,
});