import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/manage/customers")({
  component: () => <Outlet />,
});
