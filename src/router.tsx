import { QueryClient, dehydrate, hydrate } from "@tanstack/react-query";
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
    // Hand the server's query cache (categories, shop settings, products…) to
    // the browser with the page, so it does not fetch the same data again on
    // every refresh. Sent as JSON text: the cached values are plain database rows.
    dehydrate: () => ({ queryCache: JSON.stringify(dehydrate(queryClient)) }),
    hydrate: (dehydrated: { queryCache: string }) => {
      hydrate(queryClient, JSON.parse(dehydrated.queryCache));
    },
  });

  return router;
};
