"use client";

import { skipToken } from "@tanstack/react-query";

import { trpc } from "~/trpc/client";

/**
 * Data-access hooks for the goal service.
 */

type QueryOpts<TProcedure extends (...args: any) => any> = Parameters<TProcedure>[1];
type MutationOpts<TProcedure extends (...args: any) => any> = Parameters<TProcedure>[0];

type ListGoalsInput = Parameters<typeof trpc.goal.list.useQuery>[0];
type GetGoalInput = Parameters<typeof trpc.goal.get.useQuery>[0];

/** Goal row returned by goal.list / goal.get. */
export type GoalRecord = NonNullable<
  ReturnType<typeof useGoals>["goals"]
>[number];

export function useGoals(
  input: ListGoalsInput | undefined | null,
  opts?: QueryOpts<typeof trpc.goal.list.useQuery>,
) {
  const {
    data: goals,
    error,
    isError,
    isPending,
    isPlaceholderData,
    isFetching,
    isFetched,
    isLoading,
    status,
    refetch,
  } = trpc.goal.list.useQuery(input ?? skipToken, opts as never);

  return {
    goals,
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

export function useGoal(
  input: GetGoalInput | undefined | null,
  opts?: QueryOpts<typeof trpc.goal.get.useQuery>,
) {
  const {
    data: goal,
    error,
    isError,
    isPending,
    isPlaceholderData,
    isFetching,
    isFetched,
    isLoading,
    status,
    refetch,
  } = trpc.goal.get.useQuery(input ?? skipToken, opts as never);

  return {
    goal,
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

export function useCreateGoal(
  opts?: MutationOpts<typeof trpc.goal.create.useMutation>,
) {
  const utils = trpc.useUtils();
  const {
    mutateAsync: createGoalAsync,
    mutate: createGoal,
    error,
    isError,
    isPending,
    isSuccess,
    status,
  } = trpc.goal.create.useMutation({
    ...(opts as any),
    onSuccess: async (...args) => {
      await Promise.all([
        utils.goal.list.invalidate(),
        utils.goal.get.invalidate(),
      ]);
      opts?.onSuccess?.(...args);
    },
  });

  return {
    createGoalAsync,
    createGoal,
    error,
    isError,
    isPending,
    isSuccess,
    status,
  };
}

export function useUpdateGoal(
  opts?: MutationOpts<typeof trpc.goal.update.useMutation>,
) {
  const utils = trpc.useUtils();
  const {
    mutateAsync: updateGoalAsync,
    mutate: updateGoal,
    error,
    isError,
    isPending,
    isSuccess,
    status,
  } = trpc.goal.update.useMutation({
    ...(opts as any),
    onSuccess: async (...args) => {
      await Promise.all([
        utils.goal.list.invalidate(),
        utils.goal.get.invalidate(),
      ]);
      opts?.onSuccess?.(...args);
    },
  });

  return {
    updateGoalAsync,
    updateGoal,
    error,
    isError,
    isPending,
    isSuccess,
    status,
  };
}

export function useCompleteGoal(
  opts?: MutationOpts<typeof trpc.goal.complete.useMutation>,
) {
  const utils = trpc.useUtils();
  const {
    mutateAsync: completeGoalAsync,
    mutate: completeGoal,
    error,
    isError,
    isPending,
    isSuccess,
    status,
  } = trpc.goal.complete.useMutation({
    ...(opts as any),
    onSuccess: async (...args) => {
      await Promise.all([
        utils.goal.list.invalidate(),
        utils.goal.get.invalidate(),
      ]);
      opts?.onSuccess?.(...args);
    },
  });

  return {
    completeGoalAsync,
    completeGoal,
    error,
    isError,
    isPending,
    isSuccess,
    status,
  };
}

export function useCancelGoal(
  opts?: MutationOpts<typeof trpc.goal.cancel.useMutation>,
) {
  const utils = trpc.useUtils();
  const {
    mutateAsync: cancelGoalAsync,
    mutate: cancelGoal,
    error,
    isError,
    isPending,
    isSuccess,
    status,
  } = trpc.goal.cancel.useMutation({
    ...(opts as any),
    onSuccess: async (...args) => {
      await Promise.all([
        utils.goal.list.invalidate(),
        utils.goal.get.invalidate(),
      ]);
      opts?.onSuccess?.(...args);
    },
  });

  return {
    cancelGoalAsync,
    cancelGoal,
    error,
    isError,
    isPending,
    isSuccess,
    status,
  };
}

// -------------------------------------------------------------------
// Contributions — chunk-by-chunk saving
// -------------------------------------------------------------------

type ListContributionsInput = Parameters<
  typeof trpc.goal.listContributions.useQuery
>[0];

export function useGoalContributions(
  input: ListContributionsInput | undefined | null,
  opts?: QueryOpts<typeof trpc.goal.listContributions.useQuery>,
) {
  const {
    data: contributions,
    error,
    isError,
    isPending,
    isPlaceholderData,
    isFetching,
    isFetched,
    isLoading,
    status,
    refetch,
  } = trpc.goal.listContributions.useQuery(input ?? skipToken, opts as never);

  return {
    contributions,
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

/** Contribution result carrying the below-saved / target-reached flags. */
export type ContributionResult = Awaited<
  ReturnType<ReturnType<typeof useContributeToGoal>["contributeAsync"]>
>;

export function useContributeToGoal(
  opts?: MutationOpts<typeof trpc.goal.contribute.useMutation>,
) {
  const utils = trpc.useUtils();
  const {
    mutateAsync: contributeAsync,
    mutate: contribute,
    error,
    isError,
    isPending,
    isSuccess,
    status,
  } = trpc.goal.contribute.useMutation({
    ...(opts as any),
    onSuccess: async (...args) => {
      await Promise.all([
        utils.goal.list.invalidate(),
        utils.goal.get.invalidate(),
      ]);
      opts?.onSuccess?.(...args);
    },
  });

  return {
    contributeAsync,
    contribute,
    error,
    isError,
    isPending,
    isSuccess,
    status,
  };
}
