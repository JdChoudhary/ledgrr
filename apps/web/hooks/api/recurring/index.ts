"use client";

import { skipToken } from "@tanstack/react-query";

import { trpc } from "~/trpc/client";

/**
 * Data-access hooks for the recurring service.
 */

type QueryOpts<TProcedure extends (...args: any) => any> = Parameters<TProcedure>[1];
type MutationOpts<TProcedure extends (...args: any) => any> = Parameters<TProcedure>[0];

export function useRecurringRules(
  input: Parameters<typeof trpc.recurring.list.useQuery>[0] | undefined | null,
  opts?: QueryOpts<typeof trpc.recurring.list.useQuery>,
) {
  const {
    data: rules,
    error,
    isError,
    isPending,
    isPlaceholderData,
    isFetching,
    isFetched,
    isLoading,
    status,
    refetch,
  } = trpc.recurring.list.useQuery(input ?? skipToken, opts as never);

  return {
    rules,
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

export function useCreateRecurringRule(
  opts?: MutationOpts<typeof trpc.recurring.create.useMutation>,
) {
  const utils = trpc.useUtils();
  const {
    mutateAsync: createRuleAsync,
    mutate: createRule,
    error,
    isError,
    isPending,
    isSuccess,
    status,
  } = trpc.recurring.create.useMutation({
    ...(opts as any),
    onSuccess: async (...args) => {
      await utils.recurring.list.invalidate();
      opts?.onSuccess?.(...args);
    },
  });

  return {
    createRuleAsync,
    createRule,
    error,
    isError,
    isPending,
    isSuccess,
    status,
  };
}

export function useUpdateRecurringRuleStatus(
  opts?: MutationOpts<typeof trpc.recurring.pause.useMutation>,
) {
  const utils = trpc.useUtils();
  const {
    mutateAsync: updateRuleStatusAsync,
    mutate: updateRuleStatus,
    error,
    isError,
    isPending,
    isSuccess,
    status,
  } = trpc.recurring.pause.useMutation({
    ...(opts as any),
    onSuccess: async (...args) => {
      await utils.recurring.list.invalidate();
      opts?.onSuccess?.(...args);
    },
  });

  return {
    updateRuleStatusAsync,
    updateRuleStatus,
    error,
    isError,
    isPending,
    isSuccess,
    status,
  };
}

export function useResumeRecurringRule(
  opts?: MutationOpts<typeof trpc.recurring.resume.useMutation>,
) {
  const utils = trpc.useUtils();
  const {
    mutateAsync: resumeRuleAsync,
    mutate: resumeRule,
    error,
    isError,
    isPending,
    isSuccess,
    status,
  } = trpc.recurring.resume.useMutation({
    ...(opts as any),
    onSuccess: async (...args) => {
      await utils.recurring.list.invalidate();
      opts?.onSuccess?.(...args);
    },
  });

  return {
    resumeRuleAsync,
    resumeRule,
    error,
    isError,
    isPending,
    isSuccess,
    status,
  };
}

export function useCancelRecurringRule(
  opts?: MutationOpts<typeof trpc.recurring.cancel.useMutation>,
) {
  const utils = trpc.useUtils();
  const {
    mutateAsync: cancelRuleAsync,
    mutate: cancelRule,
    error,
    isError,
    isPending,
    isSuccess,
    status,
  } = trpc.recurring.cancel.useMutation({
    ...(opts as any),
    onSuccess: async (...args) => {
      await utils.recurring.list.invalidate();
      opts?.onSuccess?.(...args);
    },
  });

  return {
    cancelRuleAsync,
    cancelRule,
    error,
    isError,
    isPending,
    isSuccess,
    status,
  };
}

export function useRecurringOccurrences(
  input: Parameters<typeof trpc.recurring.listOccurrences.useQuery>[0] | undefined | null,
  opts?: QueryOpts<typeof trpc.recurring.listOccurrences.useQuery>,
) {
  const {
    data: occurrences,
    error,
    isError,
    isPending,
    isPlaceholderData,
    isFetching,
    isFetched,
    isLoading,
    status,
    refetch,
  } = trpc.recurring.listOccurrences.useQuery(input ?? skipToken, opts as never);

  return {
    occurrences,
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

/**
 * Dates a rule is due on this month, projected from its schedule. Complements
 * `useRecurringOccurrences`, which only knows about rows that already exist.
 */
export function useRecurringProjectedOccurrences(
  input: Parameters<typeof trpc.recurring.projectedOccurrences.useQuery>[0] | undefined | null,
  opts?: QueryOpts<typeof trpc.recurring.projectedOccurrences.useQuery>,
) {
  const {
    data: projectedOccurrences,
    error,
    isError,
    isPending,
    isPlaceholderData,
    isFetching,
    isFetched,
    isLoading,
    status,
    refetch,
  } = trpc.recurring.projectedOccurrences.useQuery(input ?? skipToken, opts as never);

  return {
    projectedOccurrences,
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

export function useConfirmOccurrence(
  opts?: MutationOpts<typeof trpc.recurring.confirmOccurrence.useMutation>,
) {
  const utils = trpc.useUtils();
  const {
    mutateAsync: confirmOccurrenceAsync,
    mutate: confirmOccurrence,
    error,
    isError,
    isPending,
    isSuccess,
    status,
  } = trpc.recurring.confirmOccurrence.useMutation({
    ...(opts as any),
    onSuccess: async (...args) => {
      await Promise.all([
        utils.recurring.listOccurrences.invalidate(),
        utils.transaction.list.invalidate(),
        utils.account.list.invalidate(),
      ]);
      opts?.onSuccess?.(...args);
    },
  });

  return {
    confirmOccurrenceAsync,
    confirmOccurrence,
    error,
    isError,
    isPending,
    isSuccess,
    status,
  };
}

export function useSkipOccurrence(
  opts?: MutationOpts<typeof trpc.recurring.skipOccurrence.useMutation>,
) {
  const utils = trpc.useUtils();
  const {
    mutateAsync: skipOccurrenceAsync,
    mutate: skipOccurrence,
    error,
    isError,
    isPending,
    isSuccess,
    status,
  } = trpc.recurring.skipOccurrence.useMutation({
    ...(opts as any),
    onSuccess: async (...args) => {
      await utils.recurring.listOccurrences.invalidate();
      opts?.onSuccess?.(...args);
    },
  });

  return {
    skipOccurrenceAsync,
    skipOccurrence,
    error,
    isError,
    isPending,
    isSuccess,
    status,
  };
}

/**
 * Lazy catch-up — posts every due auto-post occurrence for the space.
 * Fire-and-forget on load; invalidates the transaction list when something
 * was actually posted so the ledger refreshes.
 */
export function useRecurringCatchUp(
  opts?: MutationOpts<typeof trpc.recurring.catchUp.useMutation>,
) {
  const utils = trpc.useUtils();
  const mutation = trpc.recurring.catchUp.useMutation({
    ...(opts as any),
    onSuccess: async (result, ...rest) => {
      if (result && result.posted > 0) {
        await utils.transaction.list.invalidate();
      }
      opts?.onSuccess?.(result, ...rest);
    },
  });

  return {
    catchUpAsync: mutation.mutateAsync,
    catchUp: mutation.mutate,
    mutate: mutation.mutate,
    mutateAsync: mutation.mutateAsync,
    posted: mutation.data?.posted,
    error: mutation.error,
    isError: mutation.isError,
    isPending: mutation.isPending,
    isSuccess: mutation.isSuccess,
    status: mutation.status,
  };
}
