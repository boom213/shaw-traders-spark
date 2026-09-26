import type { UseQueryOptions } from "@tanstack/react-query";

/** Operational manager data should refresh after staff return to the tab. */
export const MANAGE_QUERY_OPTIONS = {
  refetchOnWindowFocus: true,
} satisfies Pick<UseQueryOptions, "refetchOnWindowFocus">;