"use client";

import { useState, useMemo } from "react";
import { ChevronDown, Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useAnalyticsDailySeries } from "~/hooks/api/analytics";
import { useSpaces } from "~/hooks/api/space";
import { DailySpendSummary } from "./daily-spend-summary";
import { DailySpendChart } from "./daily-spend-chart";
import { DailySpendBreakdown } from "./daily-spend-breakdown";

const PAGE_SIZE = 10;

const fmtCurrency =
  (currency: string) =>
  (value: number): string =>
    new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(value);

type DailySpendPageProps = {
  fromDate: string;
  toDate: string;
};

export function DailySpendPage({ fromDate, toDate }: DailySpendPageProps) {
  const spaces = useSpaces({});
  const space = spaces.spaces?.[0]?.space;
  const spaceId = space?.id;
  const currency = space?.baseCurrency ?? "USD";

  // Days load backwards in small pages from today — never into the future.
  const {
    items,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    isLoading,
  } = useAnalyticsDailySeries(
    spaceId ? { spaceId, days: PAGE_SIZE, fromDate } : undefined,
    {
      initialCursor: toDate,
      getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    },
  );

  const money = fmtCurrency(currency);

  const dailySpending = useMemo(
    () =>
      items
        .map((day) => ({ date: day.date, totalSpending: day.expense }))
        .sort((a, b) => a.date.localeCompare(b.date)),
    [items],
  );

  const totalSpent = dailySpending.reduce((sum, day) => sum + day.totalSpending, 0);
  const avgPerDay = dailySpending.length > 0 ? totalSpent / dailySpending.length : 0;
  const maxDay =
    dailySpending.length > 0 ? Math.max(...dailySpending.map((d) => d.totalSpending)) : 0;

  // Streak: consecutive days with spend ending today/yesterday.
  const [now] = useState(() => Date.now());
  const sortedDates = dailySpending
    .filter((d) => d.totalSpending > 0)
    .map((d) => d.date)
    .sort()
    .reverse();
  let streak = 0;
  if (sortedDates.length > 0) {
    const today = new Date(now).toISOString().split("T")[0];
    const yesterday = new Date(now - 86400000).toISOString().split("T")[0];
    if (sortedDates[0] === today || sortedDates[0] === yesterday) {
      streak = 1;
      for (let i = 1; i < sortedDates.length; i++) {
        const prev = new Date(sortedDates[i - 1]!);
        const curr = new Date(sortedDates[i]!);
        const diffDays = (prev.getTime() - curr.getTime()) / 86400000;
        if (diffDays === 1) streak++;
        else break;
      }
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4 p-4 md:p-6 max-w-5xl mx-auto">
        <div className="grid gap-4 sm:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-80 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 md:p-6 max-w-5xl mx-auto">
      <DailySpendSummary
        totalSpent={totalSpent}
        avgPerDay={avgPerDay}
        maxDay={maxDay}
        streak={streak}
        daysCount={dailySpending.length}
        fmt={money}
      />

      <DailySpendChart dailySpending={dailySpending} />

      <DailySpendBreakdown dailySpending={dailySpending} maxDay={maxDay} fmt={money} />

      {/* Load more — 10 days at a time, back to the start of the range. */}
      <div className="flex flex-col items-center gap-1.5 pb-2">
        {hasNextPage ? (
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 rounded-md text-xs"
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
          >
            {isFetchingNextPage ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <ChevronDown className="size-3.5" />
            )}
            Load {PAGE_SIZE} more days
          </Button>
        ) : (
          <p className="text-[11px] text-muted-foreground">
            Reached the start of the selected range
          </p>
        )}
        <p className="text-[10px] text-muted-foreground">
          Showing {dailySpending.length} day{dailySpending.length === 1 ? "" : "s"}
        </p>
      </div>
    </div>
  );
}
