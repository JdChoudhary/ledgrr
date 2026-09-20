"use client";

import { skipToken } from "@tanstack/react-query";

import { trpc } from "~/trpc/client";

/**
 * Data-access hooks for the currency service (admin-only procedures).
 */

type QueryOpts<TProcedure extends (...args: any) => any> = Parameters<TProcedure>[1];
type MutationOpts<TProcedure extends (...args: any) => any> = Parameters<TProcedure>[0];

type ListCurrenciesInput = Parameters<typeof trpc.currency.list.useQuery>[0];
type GetCurrencyInput = Parameters<typeof trpc.currency.get.useQuery>[0];

export function useCurrencies(
  input: ListCurrenciesInput | undefined | null,
  opts?: QueryOpts<typeof trpc.currency.list.useQuery>,
) {
  const {
    data: currencies,
    error,
    isError,
    isPending,
    isPlaceholderData,
    isFetching,
    isFetched,
    isLoading,
    status,
    refetch,
  } = trpc.currency.list.useQuery(input ?? skipToken, opts as never);

  return {
    currencies,
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

export function useCurrency(
  input: GetCurrencyInput | undefined | null,
  opts?: QueryOpts<typeof trpc.currency.get.useQuery>,
) {
  const {
    data: currency,
    error,
    isError,
    isPending,
    isPlaceholderData,
    isFetching,
    isFetched,
    isLoading,
    status,
    refetch,
  } = trpc.currency.get.useQuery(input ?? skipToken, opts as never);

  return {
    currency,
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

export function useCreateCurrency(
  opts?: MutationOpts<typeof trpc.currency.create.useMutation>,
) {
  const utils = trpc.useUtils();
  const {
    mutateAsync: createCurrencyAsync,
    mutate: createCurrency,
    error,
    isError,
    isPending,
    isSuccess,
    status,
  } = trpc.currency.create.useMutation({
    ...(opts as any),
    onSuccess: async (...args) => {
      await utils.currency.list.invalidate();
      opts?.onSuccess?.(...args);
    },
  });

  return {
    createCurrencyAsync,
    createCurrency,
    error,
    isError,
    isPending,
    isSuccess,
    status,
  };
}

export function useUpdateCurrency(
  opts?: MutationOpts<typeof trpc.currency.update.useMutation>,
) {
  const utils = trpc.useUtils();
  const {
    mutateAsync: updateCurrencyAsync,
    mutate: updateCurrency,
    error,
    isError,
    isPending,
    isSuccess,
    status,
  } = trpc.currency.update.useMutation({
    ...(opts as any),
    onSuccess: async (...args) => {
      await utils.currency.list.invalidate();
      opts?.onSuccess?.(...args);
    },
  });

  return {
    updateCurrencyAsync,
    updateCurrency,
    error,
    isError,
    isPending,
    isSuccess,
    status,
  };
}

export function useDeactivateCurrency(
  opts?: MutationOpts<typeof trpc.currency.deactivate.useMutation>,
) {
  const utils = trpc.useUtils();
  const {
    mutateAsync: deactivateCurrencyAsync,
    mutate: deactivateCurrency,
    error,
    isError,
    isPending,
    isSuccess,
    status,
  } = trpc.currency.deactivate.useMutation({
    ...(opts as any),
    onSuccess: async (...args) => {
      await utils.currency.list.invalidate();
      opts?.onSuccess?.(...args);
    },
  });

  return {
    deactivateCurrencyAsync,
    deactivateCurrency,
    error,
    isError,
    isPending,
    isSuccess,
    status,
  };
}

export function useActivateCurrency(
  opts?: MutationOpts<typeof trpc.currency.activate.useMutation>,
) {
  const utils = trpc.useUtils();
  const {
    mutateAsync: activateCurrencyAsync,
    mutate: activateCurrency,
    error,
    isError,
    isPending,
    isSuccess,
    status,
  } = trpc.currency.activate.useMutation({
    ...(opts as any),
    onSuccess: async (...args) => {
      await utils.currency.list.invalidate();
      opts?.onSuccess?.(...args);
    },
  });

  return {
    activateCurrencyAsync,
    activateCurrency,
    error,
    isError,
    isPending,
    isSuccess,
    status,
  };
}
