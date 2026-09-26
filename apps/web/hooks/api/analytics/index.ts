"use client";

import { skipToken } from "@tanstack/react-query";
import { trpc } from "~/trpc/client";

/**
 * Data-access hooks for the analytics (product events) router.
 *
 * `useTrackEvent` is fire-and-forget friendly: it never throws to the caller
 * and analytics failures never surface as UI errors.
 */

type MutationOpts<TProcedure extends (...args: any) => any> = Parameters<TProcedure>[0];
type QueryOpts<TProcedure extends (...args: any) => any> = Parameters<TProcedure>[1];

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

// ---------------------------------------------------------------------------
// Enhanced analytics hooks
// ---------------------------------------------------------------------------

type ComparisonInput = Parameters<typeof trpc.analytics.comparison.useQuery>[0];
type VelocityInput = Parameters<typeof trpc.analytics.velocity.useQuery>[0];
type TopMerchantsInput = Parameters<typeof trpc.analytics.topMerchants.useQuery>[0];
type SavingsRateInput = Parameters<typeof trpc.analytics.savingsRate.useQuery>[0];
type NetWorthInput = Parameters<typeof trpc.analytics.netWorth.useQuery>[0];
type NetWorthForecastInput = Parameters<typeof trpc.analytics.netWorthForecast.useQuery>[0];
type DailySpendInput = Parameters<typeof trpc.analytics.dailySpend.useQuery>[0];
type MonthlyTrendInput = Parameters<typeof trpc.analytics.monthlyTrend.useQuery>[0];
type AnalyticsNetWorthInput = Parameters<typeof trpc.analytics.netWorth.useQuery>[0];
type OverviewInput = Parameters<typeof trpc.analytics.overview.useQuery>[0];
type DashboardDataInput = Parameters<typeof trpc.analytics.dashboardData.useQuery>[0];
type NetWorthHistoryInput = Parameters<typeof trpc.analytics.netWorthHistory.useQuery>[0];
type NetWorthProjectionInput = Parameters<typeof trpc.analytics.netWorthProjection.useQuery>[0];

export function useNetWorth(
  input: NetWorthInput | undefined | null,
  opts?: QueryOpts<typeof trpc.analytics.netWorth.useQuery>,
) {
  const {
    data: netWorth,
    error,
    isError,
    isPending,
    isPlaceholderData,
    isFetching,
    isFetched,
    isLoading,
    status,
    refetch,
  } = trpc.analytics.netWorth.useQuery(input ?? skipToken, opts as never);

  return { netWorth, error, isError, isPending, isPlaceholderData, isFetching, isFetched, isLoading, status, refetch };
}

export function useNetWorthForecast(
  input: NetWorthForecastInput | undefined | null,
  opts?: QueryOpts<typeof trpc.analytics.netWorthForecast.useQuery>,
) {
  const {
    data: forecast,
    error,
    isError,
    isPending,
    isPlaceholderData,
    isFetching,
    isFetched,
    isLoading,
    status,
    refetch,
  } = trpc.analytics.netWorthForecast.useQuery(input ?? skipToken, opts as never);

  return { forecast, error, isError, isPending, isPlaceholderData, isFetching, isFetched, isLoading, status, refetch };
}

export function useAnalyticsDailySpend(
  input: DailySpendInput | undefined | null,
  opts?: QueryOpts<typeof trpc.analytics.dailySpend.useQuery>,
) {
  const {
    data: dailySpend,
    error,
    isError,
    isPending,
    isPlaceholderData,
    isFetching,
    isFetched,
    isLoading,
    status,
    refetch,
  } = trpc.analytics.dailySpend.useQuery(input ?? skipToken, opts as never);

  return { dailySpend, error, isError, isPending, isPlaceholderData, isFetching, isFetched, isLoading, status, refetch };
}

export function useAnalyticsMonthlyTrend(
  input: MonthlyTrendInput | undefined | null,
  opts?: QueryOpts<typeof trpc.analytics.monthlyTrend.useQuery>,
) {
  const {
    data: monthlyTrend,
    error,
    isError,
    isPending,
    isPlaceholderData,
    isFetching,
    isFetched,
    isLoading,
    status,
    refetch,
  } = trpc.analytics.monthlyTrend.useQuery(input ?? skipToken, opts as never);

  return { monthlyTrend, error, isError, isPending, isPlaceholderData, isFetching, isFetched, isLoading, status, refetch };
}

export function useAnalyticsComparison(
  input: ComparisonInput | undefined | null,
  opts?: QueryOpts<typeof trpc.analytics.comparison.useQuery>,
) {
  const {
    data: comparison,
    error,
    isError,
    isPending,
    isPlaceholderData,
    isFetching,
    isFetched,
    isLoading,
    status,
    refetch,
  } = trpc.analytics.comparison.useQuery(input ?? skipToken, opts as never);

  return { comparison, error, isError, isPending, isPlaceholderData, isFetching, isFetched, isLoading, status, refetch };
}

export function useAnalyticsVelocity(
  input: VelocityInput | undefined | null,
  opts?: QueryOpts<typeof trpc.analytics.velocity.useQuery>,
) {
  const {
    data: velocity,
    error,
    isError,
    isPending,
    isPlaceholderData,
    isFetching,
    isFetched,
    isLoading,
    status,
    refetch,
  } = trpc.analytics.velocity.useQuery(input ?? skipToken, opts as never);

  return { velocity, error, isError, isPending, isPlaceholderData, isFetching, isFetched, isLoading, status, refetch };
}

export function useAnalyticsTopMerchants(
  input: TopMerchantsInput | undefined | null,
  opts?: QueryOpts<typeof trpc.analytics.topMerchants.useQuery>,
) {
  const {
    data: topMerchants,
    error,
    isError,
    isPending,
    isPlaceholderData,
    isFetching,
    isFetched,
    isLoading,
    status,
    refetch,
  } = trpc.analytics.topMerchants.useQuery(input ?? skipToken, opts as never);

  return { topMerchants, error, isError, isPending, isPlaceholderData, isFetching, isFetched, isLoading, status, refetch };
}

export function useAnalyticsSavingsRate(
  input: SavingsRateInput | undefined | null,
  opts?: QueryOpts<typeof trpc.analytics.savingsRate.useQuery>,
) {
  const {
    data: savingsRate,
    error,
    isError,
    isPending,
    isPlaceholderData,
    isFetching,
    isFetched,
    isLoading,
    status,
    refetch,
  } = trpc.analytics.savingsRate.useQuery(input ?? skipToken, opts as never);

  return { savingsRate, error, isError, isPending, isPlaceholderData, isFetching, isFetched, isLoading, status, refetch };
}

// ---------------------------------------------------------------------------
// Insight page hooks
// ---------------------------------------------------------------------------

export function useAnalyticsNetWorth(
  input: AnalyticsNetWorthInput | undefined | null,
  opts?: QueryOpts<typeof trpc.analytics.netWorth.useQuery>,
) {
  const {
    data: netWorth,
    error,
    isError,
    isPending,
    isPlaceholderData,
    isFetching,
    isFetched,
    isLoading,
    status,
    refetch,
  } = trpc.analytics.netWorth.useQuery(input ?? skipToken, opts as never);

  return { netWorth, error, isError, isPending, isPlaceholderData, isFetching, isFetched, isLoading, status, refetch };
}

export function useAnalyticsOverview(
  input: OverviewInput | undefined | null,
  opts?: QueryOpts<typeof trpc.analytics.overview.useQuery>,
) {
  const {
    data: overview,
    error,
    isError,
    isPending,
    isPlaceholderData,
    isFetching,
    isFetched,
    isLoading,
    status,
    refetch,
  } = trpc.analytics.overview.useQuery(input ?? skipToken, opts as never);

  return { overview, error, isError, isPending, isPlaceholderData, isFetching, isFetched, isLoading, status, refetch };
}

export function useAnalyticsDashboardData(
  input: DashboardDataInput | undefined | null,
  opts?: QueryOpts<typeof trpc.analytics.dashboardData.useQuery>,
) {
  const {
    data: dashboardData,
    error,
    isError,
    isPending,
    isPlaceholderData,
    isFetching,
    isFetched,
    isLoading,
    status,
    refetch,
  } = trpc.analytics.dashboardData.useQuery(input ?? skipToken, opts as never);

  return { dashboardData, error, isError, isPending, isPlaceholderData, isFetching, isFetched, isLoading, status, refetch };
}

export function useAnalyticsNetWorthHistory(
  input: NetWorthHistoryInput | undefined | null,
  opts?: QueryOpts<typeof trpc.analytics.netWorthHistory.useQuery>,
) {
  const {
    data: netWorthHistory,
    error,
    isError,
    isPending,
    isPlaceholderData,
    isFetching,
    isFetched,
    isLoading,
    status,
    refetch,
  } = trpc.analytics.netWorthHistory.useQuery(input ?? skipToken, opts as never);

  return { netWorthHistory, error, isError, isPending, isPlaceholderData, isFetching, isFetched, isLoading, status, refetch };
}

export function useAnalyticsNetWorthProjection(
  input: NetWorthProjectionInput | undefined | null,
  opts?: QueryOpts<typeof trpc.analytics.netWorthProjection.useQuery>,
) {
  const {
    data: netWorthProjection,
    error,
    isError,
    isPending,
    isPlaceholderData,
    isFetching,
    isFetched,
    isLoading,
    status,
    refetch,
  } = trpc.analytics.netWorthProjection.useQuery(input ?? skipToken, opts as never);

  return { netWorthProjection, error, isError, isPending, isPlaceholderData, isFetching, isFetched, isLoading, status, refetch };
}

// ---------------------------------------------------------------------------
// Yearly series (GitHub-style year heatmap + year switcher)
// ---------------------------------------------------------------------------

type YearlySeriesInput = Parameters<typeof trpc.analytics.yearlySeries.useQuery>[0];

export function useAnalyticsYearlySeries(
  input: YearlySeriesInput | undefined | null,
  opts?: QueryOpts<typeof trpc.analytics.yearlySeries.useQuery>,
) {
  const {
    data: yearlySeries,
    error,
    isError,
    isPending,
    isPlaceholderData,
    isFetching,
    isFetched,
    isLoading,
    status,
    refetch,
  } = trpc.analytics.yearlySeries.useQuery(input ?? skipToken, opts as never);

  return { yearlySeries, error, isError, isPending, isPlaceholderData, isFetching, isFetched, isLoading, status, refetch };
}

// ---------------------------------------------------------------------------
// Paginated daily series (load-more day list)
// ---------------------------------------------------------------------------

type DailySeriesInput = Parameters<typeof trpc.analytics.dailySeries.useInfiniteQuery>[0];
type DailySeriesOptions = Parameters<typeof trpc.analytics.dailySeries.useInfiniteQuery>[1];

export function useAnalyticsDailySeries(
  input: DailySeriesInput | undefined | null,
  opts?: DailySeriesOptions,
) {
  const query = trpc.analytics.dailySeries.useInfiniteQuery(input ?? skipToken, opts as never);

  /** Flattened, ascending-by-page day rows across every loaded page. */
  const items = (query.data?.pages ?? []).flatMap((page) => page.items);
  const isLoading = query.isPending && query.fetchStatus !== "idle";

  return {
    items,
    pages: query.data?.pages ?? [],
    hasNextPage: query.hasNextPage,
    isFetchingNextPage: query.isFetchingNextPage,
    fetchNextPage: query.fetchNextPage,
    isLoading,
    isPending: query.isPending,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}
