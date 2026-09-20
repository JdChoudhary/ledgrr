"use client";

import { skipToken } from "@tanstack/react-query";

import { trpc } from "~/trpc/client";

/**
 * Data-access hooks for the transaction service — the financial source of
 * truth. Mutations invalidate the transaction list AND account balances
 * (transactions move account balances).
 */

type QueryOpts<TProcedure extends (...args: any) => any> = Parameters<TProcedure>[1];
type MutationOpts<TProcedure extends (...args: any) => any> = Parameters<TProcedure>[0];

type ListTransactionsInput = Parameters<typeof trpc.transaction.list.useQuery>[0];
type GetTransactionInput = Parameters<typeof trpc.transaction.get.useQuery>[0];

/** Transaction row returned by transaction.list / transaction.get. */
export type TransactionRecord = NonNullable<
  ReturnType<typeof useTransactions>["transactions"]
>[number];

export function useTransactions(
  input: ListTransactionsInput | undefined | null,
  opts?: QueryOpts<typeof trpc.transaction.list.useQuery>,
) {
  const {
    data: transactions,
    error,
    isError,
    isPending,
    isPlaceholderData,
    isFetching,
    isFetched,
    isLoading,
    status,
    refetch,
  } = trpc.transaction.list.useQuery(input ?? skipToken, opts as never);

  return {
    transactions,
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

export function useTransaction(
  input: GetTransactionInput | undefined | null,
  opts?: QueryOpts<typeof trpc.transaction.get.useQuery>,
) {
  const {
    data: transaction,
    error,
    isError,
    isPending,
    isPlaceholderData,
    isFetching,
    isFetched,
    isLoading,
    status,
    refetch,
  } = trpc.transaction.get.useQuery(input ?? skipToken, opts as never);

  return {
    transaction,
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

/** Pure split preview — shares without persisting anything. */
export function useSplitPreview(
  input: Parameters<typeof trpc.transaction.previewSplit.useQuery>[0] | undefined | null,
  opts?: QueryOpts<typeof trpc.transaction.previewSplit.useQuery>,
) {
  const {
    data: shares,
    error,
    isError,
    isPending,
    isPlaceholderData,
    isFetching,
    isFetched,
    isLoading,
    status,
    refetch,
  } = trpc.transaction.previewSplit.useQuery(input ?? skipToken, opts as never);

  return {
    shares,
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

export function useCreateTransaction(
  opts?: MutationOpts<typeof trpc.transaction.create.useMutation>,
) {
  const utils = trpc.useUtils();
  const {
    mutateAsync: createTransactionAsync,
    mutate: createTransaction,
    error,
    isError,
    isPending,
    isSuccess,
    status,
  } = trpc.transaction.create.useMutation({
    ...(opts as any),
    onSuccess: async (...args) => {
      await Promise.all([
        utils.transaction.list.invalidate(),
        utils.transaction.get.invalidate(),
        utils.account.list.invalidate(),
      ]);
      opts?.onSuccess?.(...args);
    },
  });

  return {
    createTransactionAsync,
    createTransaction,
    error,
    isError,
    isPending,
    isSuccess,
    status,
  };
}

export function useDeleteTransaction(
  opts?: MutationOpts<typeof trpc.transaction.delete.useMutation>,
) {
  const utils = trpc.useUtils();
  const {
    mutateAsync: deleteTransactionAsync,
    mutate: deleteTransaction,
    error,
    isError,
    isPending,
    isSuccess,
    status,
  } = trpc.transaction.delete.useMutation({
    ...(opts as any),
    onSuccess: async (...args) => {
      await Promise.all([
        utils.transaction.list.invalidate(),
        utils.account.list.invalidate(),
        utils.debt.list.invalidate(),
      ]);
      opts?.onSuccess?.(...args);
    },
  });

  return {
    deleteTransactionAsync,
    deleteTransaction,
    error,
    isError,
    isPending,
    isSuccess,
    status,
  };
}
