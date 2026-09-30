import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/trade")({ component: TradeLayout });

function TradeLayout() {
  return <Outlet />;
}