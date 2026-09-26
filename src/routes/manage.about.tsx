import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/manage/about")({
  beforeLoad: () => {
    throw redirect({ to: "/manage/settings", search: { tab: "about" } });
  },
});
