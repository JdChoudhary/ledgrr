"use client";

import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { BarChart3 } from "lucide-react";
import { useAnalyticsOverview } from "~/hooks/api/analytics";
import { useSpaces } from "~/hooks/api/space";
import { DailyActivityCard } from "@/features/insights";
import { AnalyticsSummary } from "./analytics-summary";
import { AnalyticsTrends } from "./analytics-trends";
import { AnalyticsCategories } from "./analytics-categories";
import { AnalyticsBreakdown } from "./analytics-breakdown";
import { AnalyticsAccountActivity } from "./analytics-account-activity";

const fmtCurrency = (currency: string) => (value: number): string =>
  new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);

type AnalyticsPageProps = {
  fromDate: string;
  toDate: string;
};

export function AnalyticsPage({ fromDate, toDate }: AnalyticsPageProps) {
  const spaces = useSpaces({});
  const space = spaces.spaces?.[0]?.space;
  const spaceId = space?.id;
  const currency = space?.baseCurrency ?? "USD";

  const { overview, isLoading, error: analyticsError } = useAnalyticsOverview(
    spaceId ? { spaceId, fromDate, toDate } : undefined,
  );

  const money = fmtCurrency(currency);

  if (isLoading || !spaceId) {
    return (
      <div className="container mx-auto p-4 max-w-6xl space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-md animate-pulse bg-muted" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-64 rounded-md animate-pulse bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  if (analyticsError) {
    return (
      <div className="container mx-auto p-4 max-w-6xl space-y-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <BarChart3 className="h-6 w-6" />
          Analytics
        </h1>
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-sm text-destructive mb-2">Failed to load analytics</p>
            <p className="text-xs text-muted-foreground">{analyticsError.message || "Something went wrong"}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!overview) return null;

  const { summary, byCategory, byGroup, byMonth, topMerchants, accountBreakdown } = overview;

  const expenseByCategory = byCategory
    .filter((c) => c.type === "expense")
    .sort((a, b) => b.total - a.total);

  const incomeByCategory = byCategory
    .filter((c) => c.type === "income")
    .sort((a, b) => b.total - a.total);

  const maxExpense = Math.max(...expenseByCategory.map((c) => c.total), 1);

  return (
    <div className="container mx-auto p-4 max-w-6xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6" />
            Analytics
          </h1>
          <p className="text-sm text-muted-foreground">
            Financial insights for {format(new Date(fromDate), "PP")} – {format(new Date(toDate), "PP")}
          </p>
        </div>
      </div>

      <AnalyticsSummary summary={summary} fmt={money} />

      <AnalyticsTrends byMonth={byMonth} fmt={money} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <AnalyticsCategories
          expenseByCategory={expenseByCategory}
          incomeByCategory={incomeByCategory}
          maxExpense={maxExpense}
          fmt={money}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <AnalyticsBreakdown
          byGroup={byGroup}
          topMerchants={topMerchants}
          fmt={money}
        />
      </div>

      <AnalyticsAccountActivity
        accountBreakdown={accountBreakdown}
        fmt={money}
      />

      {/* Day-by-day activity with incremental "load more" — 10 days per page. */}
      <DailyActivityCard
        spaceId={spaceId}
        fromDate={fromDate}
        toDate={toDate}
        currency={currency}
      />
    </div>
  );
}
