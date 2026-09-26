import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { RouteError, reportRouteError } from "@/components/site/RouteError";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  // Catalogue data changes rarely; keeping it fresh for a minute and in
  // memory for half an hour makes browsing between pages instant on a phone.
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000,
        gcTime: 30 * 60_000,
        refetchOnWindowFocus: false,
        retry: 1,
      },
    },
  });

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreload: "intent",
    // TanStack Query owns catalogue freshness; router preloads should not add
    // a second freshness window around the same loader promise.
    defaultPreloadStaleTime: 0,
    defaultErrorComponent: RouteError,
    defaultOnCatch: (error) => reportRouteError(error, "default_on_catch"),
  });

  return router;
};
