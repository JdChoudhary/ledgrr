"use client";

import { trpc } from "~/trpc/client";

/**
 * Data-access hooks for the health router (public).
 */

export function useHealth(
  opts?: Parameters<typeof trpc.health.getHealth.useQuery>[1],
) {
  const {
    data: health,
    error,
    isError,
    isPending,
    isPlaceholderData,
    isFetching,
    isFetched,
    isLoading,
    status,
    refetch,
  } = trpc.health.getHealth.useQuery(undefined, opts as never);

  return {
    health,
    error,
    isError,
    isPending,
    isPlaceholderData,
    isFetching,
    isFetched,
    isLoading,
    status,
    refetch,
  };
}
