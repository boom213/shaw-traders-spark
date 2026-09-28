import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/manage/orders")({ component: OrdersLayout });

function OrdersLayout() {
  return <Outlet />;
}