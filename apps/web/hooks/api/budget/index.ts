"use client";

import { skipToken } from "@tanstack/react-query";

import { trpc } from "~/trpc/client";

/**
 * Data-access hooks for the budget service. Mutations invalidate the
 * budget list, grouped budgets, and single budget.
 */

type QueryOpts<TProcedure extends (...args: any) => any> = Parameters<TProcedure>[1];
type MutationOpts<TProcedure extends (...args: any) => any> = Parameters<TProcedure>[0];

type ListBudgetsInput = Parameters<typeof trpc.budget.list.useQuery>[0];
type GetBudgetInput = Parameters<typeof trpc.budget.get.useQuery>[0];
type ListBudgetPeriodsInput = Parameters<typeof trpc.budget.listPeriods.useQuery>[0];
type BudgetStatusInput = Parameters<typeof trpc.budget.status.useQuery>[0];
type ListGroupedBudgetsInput = Parameters<typeof trpc.budget.listGrouped.useQuery>[0];

export function useBudgets(
  input: ListBudgetsInput | undefined | null,
  opts?: QueryOpts<typeof trpc.budget.list.useQuery>,
) {
  const {
    data: budgets,
    error,
    isError,
    isPending,
    isPlaceholderData,
    isFetching,
    isFetched,
    isLoading,
    status,
    refetch,
  } = trpc.budget.list.useQuery(input ?? skipToken, opts as never);

  return {
    budgets,
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

/** Budgets grouped by category group → category (one budget per category). */
export function useGroupedBudgets(
  input: ListGroupedBudgetsInput | undefined | null,
  opts?: QueryOpts<typeof trpc.budget.listGrouped.useQuery>,
) {
  const {
    data: groupedBudgets,
    error,
    isError,
    isPending,
    isPlaceholderData,
    isFetching,
    isFetched,
    isLoading,
    status,
    refetch,
  } = trpc.budget.listGrouped.useQuery(input ?? skipToken, opts as never);

  return {
    groupedBudgets,
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

export function useBudget(
  input: GetBudgetInput | undefined | null,
  opts?: QueryOpts<typeof trpc.budget.get.useQuery>,
) {
  const {
    data: budget,
    error,
    isError,
    isPending,
    isPlaceholderData,
    isFetching,
    isFetched,
    isLoading,
    status,
    refetch,
  } = trpc.budget.get.useQuery(input ?? skipToken, opts as never);

  return {
    budget,
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

export function useBudgetPeriods(
  input: ListBudgetPeriodsInput | undefined | null,
  opts?: QueryOpts<typeof trpc.budget.listPeriods.useQuery>,
) {
  const {
    data: budgetPeriods,
    error,
    isError,
    isPending,
    isPlaceholderData,
    isFetching,
    isFetched,
    isLoading,
    status,
    refetch,
  } = trpc.budget.listPeriods.useQuery(input ?? skipToken, opts as never);

  return {
    budgetPeriods,
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

export function useBudgetStatus(
  input: BudgetStatusInput | undefined | null,
  opts?: QueryOpts<typeof trpc.budget.status.useQuery>,
) {
  const {
    data: budgetStatus,
    error,
    isError,
    isPending,
    isPlaceholderData,
    isFetching,
    isFetched,
    isLoading,
    status,
    refetch,
  } = trpc.budget.status.useQuery(input ?? skipToken, opts as never);

  return {
    budgetStatus,
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

export function useCreateBudget(
  opts?: MutationOpts<typeof trpc.budget.create.useMutation>,
) {
  const utils = trpc.useUtils();
  const {
    mutateAsync: createBudgetAsync,
    mutate: createBudget,
    error,
    isError,
    isPending,
    isSuccess,
    status,
  } = trpc.budget.create.useMutation({
    ...(opts as any),
    onSuccess: async (...args) => {
      await Promise.all([
        utils.budget.list.invalidate(),
        utils.budget.listGrouped.invalidate(),
        utils.budget.get.invalidate(),
      ]);
      opts?.onSuccess?.(...args);
    },
  });

  return {
    createBudgetAsync,
    createBudget,
    error,
    isError,
    isPending,
    isSuccess,
    status,
  };
}

export function useUpdateBudget(
  opts?: MutationOpts<typeof trpc.budget.update.useMutation>,
) {
  const utils = trpc.useUtils();
  const {
    mutateAsync: updateBudgetAsync,
    mutate: updateBudget,
    error,
    isError,
    isPending,
    isSuccess,
    status,
  } = trpc.budget.update.useMutation({
    ...(opts as any),
    onSuccess: async (...args) => {
      await Promise.all([
        utils.budget.list.invalidate(),
        utils.budget.listGrouped.invalidate(),
        utils.budget.get.invalidate(),
      ]);
      opts?.onSuccess?.(...args);
    },
  });

  return {
    updateBudgetAsync,
    updateBudget,
    error,
    isError,
    isPending,
    isSuccess,
    status,
  };
}

export function useArchiveBudget(
  opts?: MutationOpts<typeof trpc.budget.archive.useMutation>,
) {
  const utils = trpc.useUtils();
  const {
    mutateAsync: archiveBudgetAsync,
    mutate: archiveBudget,
    error,
    isError,
    isPending,
    isSuccess,
    status,
  } = trpc.budget.archive.useMutation({
    ...(opts as any),
    onSuccess: async (...args) => {
      await Promise.all([
        utils.budget.list.invalidate(),
        utils.budget.listGrouped.invalidate(),
        utils.budget.get.invalidate(),
      ]);
      opts?.onSuccess?.(...args);
    },
  });

  return {
    archiveBudgetAsync,
    archiveBudget,
    error,
    isError,
    isPending,
    isSuccess,
    status,
  };
}

export function useUnarchiveBudget(
  opts?: MutationOpts<typeof trpc.budget.unarchive.useMutation>,
) {
  const utils = trpc.useUtils();
  const {
    mutateAsync: unarchiveBudgetAsync,
    mutate: unarchiveBudget,
    error,
    isError,
    isPending,
    isSuccess,
    status,
  } = trpc.budget.unarchive.useMutation({
    ...(opts as any),
    onSuccess: async (...args) => {
      await Promise.all([
        utils.budget.list.invalidate(),
        utils.budget.listGrouped.invalidate(),
        utils.budget.get.invalidate(),
      ]);
      opts?.onSuccess?.(...args);
    },
  });

  return {
    unarchiveBudgetAsync,
    unarchiveBudget,
    error,
    isError,
    isPending,
    isSuccess,
    status,
  };
}
