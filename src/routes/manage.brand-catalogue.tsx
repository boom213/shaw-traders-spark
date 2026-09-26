import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/manage/brand-catalogue")({
  beforeLoad: () => {
    throw redirect({ to: "/manage/settings", search: { tab: "brand-catalogue" } });
  },
});
