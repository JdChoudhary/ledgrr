"use client";

import { useMemo } from "react";
import { format, parseISO } from "date-fns";
import { ChevronDown, Loader2, CalendarDays } from "lucide-react";

import { cn } from "cn";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAnalyticsDailySeries } from "~/hooks/api/analytics";

type DailyActivityCardProps = {
  spaceId: string | undefined;
  fromDate: string;
  toDate: string;
  currency: string;
  title?: string;
  description?: string;
  /** Days fetched per page (and per "load more" click). */
  pageSize?: number;
};

/**
 * Day-by-day income/expense list that loads backwards in small pages.
 *
 * Starts at the range end (today by default) and pages back in `pageSize`
 * day chunks until the range start is reached — it never fetches a future
 * date.
 */
export function DailyActivityCard({
  spaceId,
  fromDate,
  toDate,
  currency,
  title = "Daily activity",
  description = "Newest first — load older days as you go",
  pageSize = 10,
}: DailyActivityCardProps) {
  const money = useMemo(
    () => (value: number) =>
      new Intl.NumberFormat(undefined, {
        style: "currency",
        currency,
        maximumFractionDigits: 0,
      }).format(value),
    [currency],
  );

  const {
    items,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    isLoading,
  } = useAnalyticsDailySeries(spaceId ? { spaceId, days: pageSize, fromDate } : undefined, {
    initialCursor: toDate,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });

  // Newest first for display.
  const rows = useMemo(
    () =>
      [...items].sort((a, b) => b.date.localeCompare(a.date)),
    [items],
  );

  const maxExpense = useMemo(
    () => Math.max(...rows.map((row) => row.expense), 1),
    [rows],
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <CalendarDays className="size-4" />
          {title}
        </CardTitle>
        <CardDescription className="text-xs text-muted-foreground">
          {description}
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-9" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            No activity in this range
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {rows.map((row) => {
              const date = parseISO(row.date);
              return (
                <div key={row.date} className="flex items-center gap-3 py-2">
                  <div className="w-16 shrink-0">
                    <p className="text-xs font-medium">{format(date, "EEE")}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {format(date, "MMM d")}
                    </p>
                  </div>

                  <div className="flex-1">
                    <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-rose-500/70 transition-all"
                        style={{
                          width: `${maxExpense > 0 ? Math.min(100, (row.expense / maxExpense) * 100) : 0}%`,
                        }}
                      />
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-3 text-xs tabular-nums">
                    {row.income > 0 ? (
                      <span className="text-emerald-600 dark:text-emerald-400">
                        +{money(row.income)}
                      </span>
                    ) : null}
                    <span
                      className={cn(
                        "w-20 text-right font-semibold",
                        row.expense > 0 ? "text-foreground" : "text-muted-foreground",
                      )}
                    >
                      {row.expense > 0 ? `−${money(row.expense)}` : "—"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {rows.length > 0 ? (
          <div className="flex justify-center pt-4">
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
                Load {pageSize} more days
              </Button>
            ) : (
              <p className="text-[11px] text-muted-foreground">
                Reached the start of the selected range
              </p>
            )}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
