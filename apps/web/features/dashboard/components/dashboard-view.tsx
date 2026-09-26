"use client";

import * as React from "react";
import Link from "next/link";
import { format } from "date-fns";
import {
  ArrowDownLeftIcon,
  ArrowLeftRightIcon,
  ArrowUpRightIcon,
  HandCoinsIcon,
  TrendingUpIcon,
} from "lucide-react";
import { Bar, BarChart, CartesianGrid, Pie, PieChart, Cell, Tooltip, XAxis, YAxis } from "recharts";

import { cn } from "cn";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";


import {
  useDashboardCashflow,
  useDashboardCategoryBreakdown,
  useDashboardFundFlow,
  useDashboardSummary,
  useRecentTransactions,
} from "~/hooks/api/dashboard";
import {
  useTrackEvent,
  useAnalyticsComparison,
  useAnalyticsVelocity,
  useAnalyticsTopMerchants,
  useAnalyticsSavingsRate,
  useNetWorthForecast,
  useAnalyticsDailySpend,
  useAnalyticsMonthlyTrend,
} from "~/hooks/api/analytics";
import { useUserSettings } from "~/hooks/api/user-settings";
import { FundFlowChart } from "./fund-flow-chart";
import { SpendingHeatmap } from "./spending-heatmap";
import { NetWorthForecastCard } from "./net-worth-forecast-card";
import { DailySpendCard } from "./daily-spend-card";
import { MonthlyTrendCard } from "./monthly-trend-card";

/**
 * Dashboard view — headline numbers + charts + recent activity.
 *
 * Charts follow the established design language (budget-charts):
 * ChartContainer + recharts inside Cards, var(--chart-1..5) palette.
 * Financial figures come from the dashboard router, which computes them
 * from posted, non-deleted transactions using personal_amount (your share
 * of split expenses) — never from analytics events.
 */

const PIE_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

/** Shown when there is nothing to plot (or a chart fails to render). */
const emptyPie = (
  <div className="flex h-72 items-center justify-center text-sm text-muted-foreground">
    No expenses in this period
  </div>
);

type DashboardViewProps = {
  fromDate: string;
  toDate: string;
};

const fmt =
  (currency: string) =>
  (value: number): string =>
    new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(value);

const TYPE_META: Record<string, { icon: React.ElementType; className: string; label: string }> = {
  income: { icon: ArrowDownLeftIcon, className: "text-emerald-600", label: "Income" },
  expense: { icon: ArrowUpRightIcon, className: "text-red-600", label: "Expense" },
  transfer: { icon: ArrowLeftRightIcon, className: "text-blue-600", label: "Transfer" },
  refund: { icon: ArrowDownLeftIcon, className: "text-emerald-600", label: "Refund" },
};

export function DashboardView({ fromDate, toDate }: DashboardViewProps) {
  const { userSettings } = useUserSettings({});
  const currency = userSettings?.displayCurrency ?? "USD";

  // Product analytics: page-view event (client-side demo of the track hook;
  // financial events fire server-side inside the services).
  const { trackEvent } = useTrackEvent();
  React.useEffect(() => {
    trackEvent({
      eventName: "dashboard_viewed",
      eventCategory: "navigation",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const rangeInput = { fromDate, toDate };

  const summary = useDashboardSummary(rangeInput);
  const cashflow = useDashboardCashflow(rangeInput);
  const breakdown = useDashboardCategoryBreakdown(rangeInput);
  const fundFlow = useDashboardFundFlow(rangeInput);
  const recent = useRecentTransactions({ limit: 8 });

  // Enhanced analytics
  const comparison = useAnalyticsComparison(rangeInput);
  const velocity = useAnalyticsVelocity(rangeInput);
  const topMerchants = useAnalyticsTopMerchants(rangeInput);
  const savingsRate = useAnalyticsSavingsRate(rangeInput);
  const netWorthForecast = useNetWorthForecast({ months: 3, horizon: 6 });
  const dailySpend = useAnalyticsDailySpend({ days: 90 });
  const monthlyTrend = useAnalyticsMonthlyTrend({ months: 6 });

  const summaryData = summary.summary;
  const cashflowData = cashflow.cashflow ?? [];
  const breakdownData = breakdown.breakdown ?? [];

  const recentRows = recent.recentTransactions ?? [];

  const money = fmt(currency);

  const cashflowConfig = {
    income: { label: "Income", color: "var(--chart-2)" },
    expense: { label: "Expense", color: "var(--chart-1)" },
  } satisfies ChartConfig;

  const pieData = breakdownData.map((row, i) => ({
    name: row.name,
    value: row.amount,
    fill: PIE_COLORS[i % PIE_COLORS.length],
  }));

  const pieConfig = {
    name: { label: "Category", color: "var(--foreground)" },
  } satisfies ChartConfig;

  return (
    <div className="flex flex-col gap-4">
      {/* Summary cards */}
      {summary.isPending ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-0">
              <CardDescription className="text-xs text-muted-foreground">Income</CardDescription>
              <CardTitle className="text-2xl font-semibold tabular-nums text-emerald-600">
                {money(Number(summaryData?.income ?? 0))}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">
              {summaryData?.refund && Number(summaryData.refund) > 0
                ? `incl. ${money(Number(summaryData.refund))} refunds`
                : "\u00A0"}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-0">
              <CardDescription className="text-xs text-muted-foreground">
                Your spending
              </CardDescription>
              <CardTitle className="text-2xl font-semibold tabular-nums text-red-600">
                {money(Number(summaryData?.personalExpense ?? 0))}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">
              {summaryData && summaryData.splitCount > 0
                ? `your share · gross ${money(Number(summaryData.grossExpense))}`
                : "\u00A0"}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-0">
              <CardDescription className="text-xs text-muted-foreground">
                Outstanding debts
              </CardDescription>
              <CardTitle className="text-2xl font-semibold tabular-nums text-amber-600">
                {money(Number(summaryData?.outstandingDebt ?? 0))}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">
              <Link href="/dashboard/debts" className="hover:underline">
                View debts →
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-0">
              <CardDescription className="text-xs text-muted-foreground">
                Transactions
              </CardDescription>
              <CardTitle className="text-2xl font-semibold tabular-nums">
                {summaryData?.transactionCount ?? 0}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">
              {summaryData && summaryData.splitCount > 0
                ? `${summaryData.splitCount} split`
                : "\u00A0"}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Month-over-month comparison + savings rate + velocity */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Comparison */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">vs Last Period</CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Month-over-month change
            </CardDescription>
          </CardHeader>
          <CardContent>
            {comparison.isPending ? (
              <Skeleton className="h-20" />
            ) : (comparison.comparison ?? []).length === 0 ? (
              <p className="text-xs text-muted-foreground">No data</p>
            ) : (
              <div className="space-y-2">
                {(comparison.comparison ?? []).map((row) => {
                  const isPositive = row.changePercent > 0;
                  const isNeutral = Math.abs(row.changePercent) < 1;
                  return (
                    <div key={row.metric} className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">{row.metric}</span>
                      <span
                        className={cn(
                          "font-medium tabular-nums",
                          isNeutral
                            ? "text-muted-foreground"
                            : isPositive
                              ? "text-emerald-600"
                              : "text-red-600",
                        )}
                      >
                        {isNeutral
                          ? "—"
                          : `${isPositive ? "+" : ""}${row.changePercent.toFixed(1)}%`}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Savings rate */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Savings Rate</CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              How much you keep
            </CardDescription>
          </CardHeader>
          <CardContent>
            {savingsRate.isPending ? (
              <Skeleton className="h-20" />
            ) : !savingsRate.savingsRate ? (
              <p className="text-xs text-muted-foreground">No data</p>
            ) : (
              <div className="space-y-2">
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold tabular-nums">
                    {savingsRate.savingsRate.rate.toFixed(1)}%
                  </span>
                  <span className="text-xs text-muted-foreground">saved</span>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Income: {money(savingsRate.savingsRate.income)}</span>
                  <span>Spent: {money(savingsRate.savingsRate.expense)}</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all"
                    style={{
                      width: `${Math.min(100, Math.max(0, savingsRate.savingsRate.rate))}%`,
                    }}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Spending velocity */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Spending Velocity</CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Daily average & projection
            </CardDescription>
          </CardHeader>
          <CardContent>
            {velocity.isPending ? (
              <Skeleton className="h-20" />
            ) : !velocity.velocity ? (
              <p className="text-xs text-muted-foreground">No data</p>
            ) : (
              <div className="space-y-2">
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold tabular-nums">
                    {money(velocity.velocity.dailyAverage)}
                  </span>
                  <span className="text-xs text-muted-foreground">/day avg</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">
                    Trend:{" "}
                    {velocity.velocity.trend === "increasing"
                      ? "📈 rising"
                      : velocity.velocity.trend === "decreasing"
                        ? "📉 falling"
                        : "➡️ stable"}
                  </span>
                  <span className="text-muted-foreground">
                    {velocity.velocity.daysWithActivity}/{velocity.velocity.daysInPeriod} active
                    days
                  </span>
                </div>
                <div className="rounded-md border px-2 py-1 text-xs text-muted-foreground">
                  Projected this period:{" "}
                  <span className="font-medium text-foreground">
                    {money(velocity.velocity.projectedMonthEnd)}
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts: cash flow + category donut */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-0">
            <CardTitle className="text-sm font-semibold">Cash flow</CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Daily income vs your spending
            </CardDescription>
          </CardHeader>
          <CardContent className="px-2 pb-2 sm:px-4">
            {cashflow.isPending ? (
              <Skeleton className="h-[280px]" />
            ) : cashflowData.length === 0 ? (
              <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
                No activity in this period
              </div>
            ) : (
              <div className="h-[280px]">
                <ChartContainer config={cashflowConfig} className="h-full w-full">
                  <BarChart data={cashflowData} margin={{ left: 4, right: 8 }}>
                    <CartesianGrid vertical={false} />
                    <XAxis
                      dataKey="date"
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v: string) => format(new Date(v), "d MMM")}
                      minTickGap={24}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) => money(Number(v))}
                      width={70}
                    />
                    <ChartTooltip content={<ChartTooltipContent indicator="line" />} />
                    <Bar dataKey="income" fill="var(--color-income)" radius={3} />
                    <Bar dataKey="expense" fill="var(--color-expense)" radius={3} />
                  </BarChart>
                </ChartContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-0">
            <CardTitle className="text-sm font-semibold">Where money goes</CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Your spending by category (your share of splits)
            </CardDescription>
          </CardHeader>
          <CardContent className="px-2 pb-2 sm:px-4">
            {breakdown.isPending ? (
              <Skeleton className="h-72" />
            ) : breakdownData.length === 0 ? (
              emptyPie
            ) : (
              <div className="h-72 w-full">
                <ChartContainer config={pieConfig} className="h-full w-full">
                  <PieChart>
                    <Tooltip content={<ChartTooltipContent indicator="dot" nameKey="name" />} />
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={90}
                      paddingAngle={3}
                      cornerRadius={6}
                      isAnimationActive
                      animationDuration={600}
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                  </PieChart>
                </ChartContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Net worth forecast + daily spend */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <NetWorthForecastCard
          forecast={netWorthForecast.forecast}
          isLoading={netWorthForecast.isPending}
        />
        <DailySpendCard
          dailySpend={dailySpend.dailySpend}
          isLoading={dailySpend.isPending}
          fmt={money}
        />
      </div>

      {/* Monthly trend */}
      <MonthlyTrendCard
        rows={monthlyTrend.monthlyTrend ?? []}
        isLoading={monthlyTrend.isPending}
        fmt={money}
      />

      {/* Charts: fund flow (sankey) + activity heatmap */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <FundFlowChart flow={fundFlow.fundFlow} isLoading={fundFlow.isPending} fmt={money} />

        <SpendingHeatmap fmt={money} />
      </div>

      {/* Top merchants */}
      <Card>
        <CardHeader className="pb-0">
          <CardTitle className="text-sm font-semibold">Top Merchants</CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            Where your money goes most
          </CardDescription>
        </CardHeader>
        <CardContent className="px-2 pb-2 sm:px-4">
          {topMerchants.isPending ? (
            <div className="space-y-2">
              <Skeleton className="h-12" />
              <Skeleton className="h-12" />
              <Skeleton className="h-12" />
            </div>
          ) : (topMerchants.topMerchants ?? []).length === 0 ? (
            <div className="py-4 text-center text-sm text-muted-foreground">
              No merchant data in this period
            </div>
          ) : (
            <div className="divide-y">
              {(topMerchants.topMerchants ?? []).map((row, i) => (
                <div key={row.merchant} className="flex items-center gap-3 px-2 py-2.5">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-medium">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{row.merchant}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {row.transactionCount} transaction{row.transactionCount === 1 ? "" : "s"} ·
                      avg {money(row.avgAmount)}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-semibold tabular-nums">
                    {money(row.totalAmount)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent activity */}
      <Card>
        <CardHeader className="pb-0">
          <CardTitle className="text-sm font-semibold">Recent activity</CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            Your latest recorded transactions
          </CardDescription>
        </CardHeader>
        <CardContent className="px-2 pb-2 sm:px-4">
          {recent.isPending ? (
            <div className="space-y-2">
              <Skeleton className="h-12" />
              <Skeleton className="h-12" />
              <Skeleton className="h-12" />
            </div>
          ) : recentRows.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <TrendingUpIcon />
                </EmptyMedia>
                <EmptyTitle>Nothing here yet</EmptyTitle>
                <EmptyDescription>
                  Record your first transaction to see it on the dashboard.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <div className="divide-y">
              {recentRows.map((row) => {
                const meta = TYPE_META[row.type] ?? TYPE_META.expense;
                const Icon = meta.icon;
                const isSigned = row.type === "income" || row.type === "refund";
                return (
                  <Link
                    key={row.id}
                    href="/dashboard/transactions"
                    className="flex items-center gap-3 px-2 py-2.5 transition-colors hover:bg-muted/50"
                  >
                    <span
                      className={cn(
                        "flex size-8 shrink-0 items-center justify-center rounded-full",
                        isSigned
                          ? "bg-emerald-500/10 text-emerald-600"
                          : row.type === "transfer"
                            ? "bg-blue-500/10 text-blue-600"
                            : "bg-red-500/10 text-red-600",
                      )}
                    >
                      <Icon className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {row.description ?? row.merchant ?? meta.label}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(row.date), "MMM d, yyyy")}
                        {row.isSplit ? " · split" : ""}
                        {row.status !== "posted" ? ` · ${row.status}` : ""}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "shrink-0 text-sm font-semibold tabular-nums",
                        isSigned ? "text-emerald-600" : "",
                      )}
                    >
                      {isSigned ? "+" : "−"}
                      {money(Number(row.personalAmount))}
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <HandCoinsIcon className="size-3.5" />
        Split expenses count only your share here — the full story is on the{" "}
        <Link href="/dashboard/transactions" className="underline hover:text-foreground">
          transactions
        </Link>{" "}
        page.
      </p>
    </div>
  );
}
