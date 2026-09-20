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
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";

import { cn } from "cn";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { Button } from "@/components/ui/button";

import {
  useDashboardCashflow,
  useDashboardCategoryBreakdown,
  useDashboardSummary,
  useRecentTransactions,
} from "~/hooks/api/dashboard";
import { useTrackEvent } from "~/hooks/api/analytics";
import { useSpaces } from "~/hooks/api/space";

/**
 * Dashboard view — headline numbers + charts + recent activity.
 *
 * Charts follow the established design language (budget-charts):
 * ChartContainer + recharts inside Cards, var(--chart-1..5) palette.
 * Financial figures come from the dashboard router, which computes them
 * from posted, non-deleted transactions using personal_amount (your share
 * of split expenses) — never from analytics events.
 */

const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

type RangeKey = "this_month" | "last_month" | "last_30_days";

const rangeBounds = (range: RangeKey): { fromDate: string; toDate: string; label: string } => {
  const now = new Date();
  if (range === "this_month") {
    return {
      fromDate: format(new Date(now.getFullYear(), now.getMonth(), 1), "yyyy-MM-dd"),
      toDate: format(new Date(now.getFullYear(), now.getMonth() + 1, 0), "yyyy-MM-dd"),
      label: "This month",
    };
  }
  if (range === "last_month") {
    return {
      fromDate: format(new Date(now.getFullYear(), now.getMonth() - 1, 1), "yyyy-MM-dd"),
      toDate: format(new Date(now.getFullYear(), now.getMonth(), 0), "yyyy-MM-dd"),
      label: "Last month",
    };
  }
  const from = new Date(now);
  from.setDate(from.getDate() - 29);
  return {
    fromDate: format(from, "yyyy-MM-dd"),
    toDate: format(now, "yyyy-MM-dd"),
    label: "Last 30 days",
  };
};

const RANGES: RangeKey[] = ["this_month", "last_month", "last_30_days"];

const fmt = (currency: string) => (value: number): string =>
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

export function DashboardView() {
  const spaces = useSpaces({});
  const space = spaces.spaces?.[0]?.space;
  const spaceId = space?.id;
  const currency = space?.baseCurrency ?? "USD";

  const [range, setRange] = React.useState<RangeKey>("this_month");
  const bounds = rangeBounds(range);

  // Product analytics: page-view event (client-side demo of the track hook;
  // financial events fire server-side inside the services).
  const { trackEvent } = useTrackEvent();
  React.useEffect(() => {
    if (spaceId) {
      trackEvent({
        spaceId,
        eventName: "dashboard_viewed",
        eventCategory: "navigation",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spaceId]);

  const summary = useDashboardSummary(
    spaceId ? { spaceId, fromDate: bounds.fromDate, toDate: bounds.toDate } : undefined,
  );
  const cashflow = useDashboardCashflow(
    spaceId ? { spaceId, fromDate: bounds.fromDate, toDate: bounds.toDate } : undefined,
  );
  const breakdown = useDashboardCategoryBreakdown(
    spaceId ? { spaceId, fromDate: bounds.fromDate, toDate: bounds.toDate } : undefined,
  );
  const recent = useRecentTransactions(spaceId ? { spaceId, limit: 8 } : undefined);

  const summaryData = summary.summary;
  const cashflowData = cashflow.cashflow ?? [];
  const breakdownData = breakdown.breakdown ?? [];
  const recentRows = recent.recentTransactions ?? [];

  if (!spaceId) {
    return (
      <Empty className="mt-8 border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <TrendingUpIcon />
          </EmptyMedia>
          <EmptyTitle>No space found</EmptyTitle>
          <EmptyDescription>
            Your dashboard lives inside a space. Create your personal space
            first.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  const money = fmt(currency);
  const totalPersonalExpense = breakdownData.reduce((acc, r) => acc + r.amount, 0);

  const cashflowConfig = {
    income: { label: "Income", color: "var(--chart-2)" },
    expense: { label: "Expense", color: "var(--chart-1)" },
  } satisfies ChartConfig;

  const breakdownConfig = Object.fromEntries(
    breakdownData.map((row, i) => [
      row.name,
      { label: row.name, color: CHART_COLORS[i % CHART_COLORS.length] },
    ]),
  ) satisfies ChartConfig;

  return (
    <div className="flex flex-col gap-4">
      {/* Range switcher */}
      <div className="flex items-center gap-1 self-start rounded-xl bg-muted/50 p-1">
        {RANGES.map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setRange(key)}
            className={cn(
              "rounded-lg px-3 py-1.5 text-xs font-medium transition-all",
              range === key
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {rangeBounds(key).label}
          </button>
        ))}
      </div>

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
              <CardDescription className="text-xs text-muted-foreground">
                Income
              </CardDescription>
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
            <CardTitle className="text-sm font-semibold">
              Where money goes
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Your spending by category (your share of splits)
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-1 items-center justify-center px-2 pb-2 sm:px-4">
            {breakdown.isPending ? (
              <Skeleton className="h-40 w-40 rounded-full" />
            ) : breakdownData.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                No expenses in this period
              </div>
            ) : (
              <div className="flex w-full flex-col items-center gap-6 sm:flex-row">
                <div className="relative h-40 w-40 shrink-0">
                  <ChartContainer
                    config={breakdownConfig}
                    className="aspect-square h-40 w-40"
                  >
                    <PieChart>
                      <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                      <Pie
                        data={breakdownData.map((row, i) => ({
                          name: row.name,
                          value: row.amount,
                          fill: CHART_COLORS[i % CHART_COLORS.length],
                        }))}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={52}
                        outerRadius={70}
                        strokeWidth={0}
                      >
                        {breakdownData.map((entry, i) => (
                          <Cell
                            key={entry.name}
                            fill={CHART_COLORS[i % CHART_COLORS.length]}
                          />
                        ))}
                      </Pie>
                    </PieChart>
                  </ChartContainer>
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-lg font-bold tabular-nums">
                      {money(totalPersonalExpense)}
                    </span>
                    <span className="text-[10px] text-muted-foreground">spent</span>
                  </div>
                </div>
                <div className="w-full min-w-0 flex-1 space-y-2 sm:w-44">
                  {breakdownData.slice(0, 6).map((row, i) => (
                    <div key={row.name} className="flex justify-between text-xs">
                      <span className="flex min-w-0 items-center gap-2">
                        <span
                          className="size-2 shrink-0 rounded-full"
                          style={{
                            backgroundColor: CHART_COLORS[i % CHART_COLORS.length],
                          }}
                        />
                        <span className="truncate text-muted-foreground">
                          {row.name}
                        </span>
                      </span>
                      <span className="shrink-0 font-medium tabular-nums">
                        {money(row.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

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
