"use client";

import { trpc } from "~/trpc/client";

/**
 * Data-access hooks for the analytics (product events) router.
 *
 * `useTrackEvent` is fire-and-forget friendly: it never throws to the caller
 * and analytics failures never surface as UI errors.
 */

type MutationOpts<TProcedure extends (...args: any) => any> = Parameters<TProcedure>[0];

export function useTrackEvent(
  opts?: MutationOpts<typeof trpc.analytics.track.useMutation>,
) {
  const {
    mutateAsync: trackEventAsync,
    mutate: trackEvent,
    error,
    isError,
    isPending,
    isSuccess,
    status,
  } = trpc.analytics.track.useMutation({
    ...(opts as any),
    onError: (err, variables, context, mutation) => {
      // Analytics must never surface as a user-facing failure.
      console.warn("[analytics] track failed:", err.message);
      opts?.onError?.(err, variables, context, mutation);
    },
  });

  return {
    trackEventAsync,
    trackEvent,
    error,
    isError,
    isPending,
    isSuccess,
    status,
  };
}
