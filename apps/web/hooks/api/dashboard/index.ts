"use client";

import { skipToken } from "@tanstack/react-query";

import { trpc } from "~/trpc/client";

/**
 * Data-access hooks for the dashboard router.
 *
 * All financial numbers are computed server-side from transactions (the
 * source of truth): income / personal expense / gross / refunds, plus the
 * daily cash-flow series, per-category breakdown, and account → category
 * expense flow that feed the charts.
 */

type SummaryInput = Parameters<typeof trpc.dashboard.summary.useQuery>[0];
type CashflowInput = Parameters<typeof trpc.dashboard.cashflow.useQuery>[0];
type BreakdownInput = Parameters<typeof trpc.dashboard.categoryBreakdown.useQuery>[0];
type FundFlowInput = Parameters<typeof trpc.dashboard.fundFlow.useQuery>[0];
type RecentInput = Parameters<typeof trpc.dashboard.recentTransactions.useQuery>[0];

export function useDashboardSummary(
  input: SummaryInput | undefined | null,
  opts?: Parameters<typeof trpc.dashboard.summary.useQuery>[1],
) {
  const {
    data: summary,
    error,
    isError,
    isPending,
    isPlaceholderData,
    isFetching,
    isFetched,
    isLoading,
    status,
    refetch,
  } = trpc.dashboard.summary.useQuery(input ?? skipToken, opts as never);

  return {
    summary,
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

export function useDashboardCashflow(
  input: CashflowInput | undefined | null,
  opts?: Parameters<typeof trpc.dashboard.cashflow.useQuery>[1],
) {
  const {
    data: cashflow,
    error,
    isError,
    isPending,
    isPlaceholderData,
    isFetching,
    isFetched,
    isLoading,
    status,
    refetch,
  } = trpc.dashboard.cashflow.useQuery(input ?? skipToken, opts as never);

  return {
    cashflow,
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

export function useDashboardCategoryBreakdown(
  input: BreakdownInput | undefined | null,
  opts?: Parameters<typeof trpc.dashboard.categoryBreakdown.useQuery>[1],
) {
  const {
    data: breakdown,
    error,
    isError,
    isPending,
    isPlaceholderData,
    isFetching,
    isFetched,
    isLoading,
    status,
    refetch,
  } = trpc.dashboard.categoryBreakdown.useQuery(input ?? skipToken, opts as never);

  return {
    breakdown,
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

export function useDashboardFundFlow(
  input: FundFlowInput | undefined | null,
  opts?: Parameters<typeof trpc.dashboard.fundFlow.useQuery>[1],
) {
  const {
    data: fundFlow,
    error,
    isError,
    isPending,
    isPlaceholderData,
    isFetching,
    isFetched,
    isLoading,
    status,
    refetch,
  } = trpc.dashboard.fundFlow.useQuery(input ?? skipToken, opts as never);

  return {
    fundFlow,
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

export function useRecentTransactions(
  input: RecentInput | undefined | null,
  opts?: Parameters<typeof trpc.dashboard.recentTransactions.useQuery>[1],
) {
  const {
    data: recentTransactions,
    error,
    isError,
    isPending,
    isPlaceholderData,
    isFetching,
    isFetched,
    isLoading,
    status,
    refetch,
  } = trpc.dashboard.recentTransactions.useQuery(input ?? skipToken, opts as never);

  return {
    recentTransactions,
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
