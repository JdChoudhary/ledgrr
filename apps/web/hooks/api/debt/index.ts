"use client";

import { skipToken } from "@tanstack/react-query";

import { trpc } from "~/trpc/client";

/**
 * Data-access hooks for the debt service. Debts are obligations between
 * parties — settlements are recorded in debt_payments only and never touch
 * transactions, balances or income/expense analytics.
 */

type QueryOpts<TProcedure extends (...args: any) => any> = Parameters<TProcedure>[1];
type MutationOpts<TProcedure extends (...args: any) => any> = Parameters<TProcedure>[0];

type ListDebtsInput = Parameters<typeof trpc.debt.list.useQuery>[0];

/** Enriched debt row returned by debt.list. */
export type DebtRecord = NonNullable<ReturnType<typeof useDebts>["debts"]>[number];

export function useDebts(
  input: ListDebtsInput | undefined | null,
  opts?: QueryOpts<typeof trpc.debt.list.useQuery>,
) {
  const {
    data: debts,
    error,
    isError,
    isPending,
    isPlaceholderData,
    isFetching,
    isFetched,
    isLoading,
    status,
    refetch,
  } = trpc.debt.list.useQuery(input ?? skipToken, opts as never);

  return {
    debts,
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

export function useCounterpartyBalance(
  input: Parameters<typeof trpc.debt.counterpartyBalance.useQuery>[0] | undefined | null,
  opts?: QueryOpts<typeof trpc.debt.counterpartyBalance.useQuery>,
) {
  const {
    data: counterpartyBalance,
    error,
    isError,
    isPending,
    isPlaceholderData,
    isFetching,
    isFetched,
    isLoading,
    status,
    refetch,
  } = trpc.debt.counterpartyBalance.useQuery(input ?? skipToken, opts as never);

  return {
    counterpartyBalance,
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

export function useCreateDebt(opts?: MutationOpts<typeof trpc.debt.create.useMutation>) {
  const utils = trpc.useUtils();
  const {
    mutateAsync: createDebtAsync,
    mutate: createDebt,
    error,
    isError,
    isPending,
    isSuccess,
    status,
  } = trpc.debt.create.useMutation({
    ...(opts as any),
    onSuccess: async (...args) => {
      await Promise.all([
        utils.debt.list.invalidate(),
        utils.debt.counterpartyBalance.invalidate(),
      ]);
      opts?.onSuccess?.(...args);
    },
  });

  return {
    createDebtAsync,
    createDebt,
    error,
    isError,
    isPending,
    isSuccess,
    status,
  };
}

export function useSettleDebt(opts?: MutationOpts<typeof trpc.debt.settle.useMutation>) {
  const utils = trpc.useUtils();
  const {
    mutateAsync: settleDebtAsync,
    mutate: settleDebt,
    error,
    isError,
    isPending,
    isSuccess,
    status,
  } = trpc.debt.settle.useMutation({
    ...(opts as any),
    onSuccess: async (...args) => {
      await Promise.all([
        utils.debt.list.invalidate(),
        utils.debt.counterpartyBalance.invalidate(),
      ]);
      opts?.onSuccess?.(...args);
    },
  });

  return {
    settleDebtAsync,
    settleDebt,
    error,
    isError,
    isPending,
    isSuccess,
    status,
  };
}

export function useSettleMutualDebt(
  opts?: MutationOpts<typeof trpc.debt.settleMutual.useMutation>,
) {
  const utils = trpc.useUtils();
  const {
    mutateAsync: settleMutualDebtAsync,
    mutate: settleMutualDebt,
    error,
    isError,
    isPending,
    isSuccess,
    status,
  } = trpc.debt.settleMutual.useMutation({
    ...(opts as any),
    onSuccess: async (...args) => {
      await Promise.all([
        utils.debt.list.invalidate(),
        utils.debt.counterpartyBalance.invalidate(),
      ]);
      opts?.onSuccess?.(...args);
    },
  });

  return {
    settleMutualDebtAsync,
    settleMutualDebt,
    error,
    isError,
    isPending,
    isSuccess,
    status,
  };
}

export function useCancelDebt(opts?: MutationOpts<typeof trpc.debt.cancel.useMutation>) {
  const utils = trpc.useUtils();
  const {
    mutateAsync: cancelDebtAsync,
    mutate: cancelDebt,
    error,
    isError,
    isPending,
    isSuccess,
    status,
  } = trpc.debt.cancel.useMutation({
    ...(opts as any),
    onSuccess: async (...args) => {
      await Promise.all([
        utils.debt.list.invalidate(),
        utils.debt.counterpartyBalance.invalidate(),
      ]);
      opts?.onSuccess?.(...args);
    },
  });

  return {
    cancelDebtAsync,
    cancelDebt,
    error,
    isError,
    isPending,
    isSuccess,
    status,
  };
}
