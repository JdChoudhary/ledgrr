"use client";

import { useMemo, useState } from "react";
import { ActivityCalendar } from "react-activity-calendar";
import "react-activity-calendar/tooltips.css";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";

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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { useAnalyticsYearlySeries } from "~/hooks/api/analytics";

/**
 * Year activity heatmap powered by `react-activity-calendar`.
 *
 * Three tabs read the same year of daily data — Cashflow (total volume),
 * Income, and Expense — and the year switcher walks to the nearest year with
 * posted activity.
 */

const CURRENT_YEAR = new Date().getFullYear();

type Metric = "cashflow" | "income" | "expense";

// Emerald → rose → neutral theme arrays for the five intensity levels.
const THEME: Record<Metric, { light: string[]; dark: string[] }> = {
  cashflow: {
    light: ["#e0e7ff", "#818cf8", "#6366f1", "#4f46e5", "#3730a3"],
    dark: ["#312e81", "#4338ca", "#6366f1", "#818cf8", "#c7d2fe"],
  },
  income: {
    light: ["#ecfdf5", "#6ee7b7", "#34d399", "#10b981", "#047857"],
    dark: ["#064e3b", "#059669", "#10b981", "#34d399", "#6ee7b7"],
  },
  expense: {
    light: ["#fff1f2", "#fda4af", "#fb7185", "#f43f5e", "#be123c"],
    dark: ["#4c0519", "#9f1239", "#e11d48", "#fb7185", "#fecdd3"],
  },
};

// Which `count` field powers each tab's heatmap intensity.
const COUNT_KEY: Record<Metric, (row: { income: number; expense: number }) => number> = {
  cashflow: (row) => row.income + row.expense,
  income: (row) => row.income,
  expense: (row) => row.expense,
};

function buildData(
  days: { date: string; income: number; expense: number }[],
  metric: Metric,
): { date: string; count: number; level: number }[] {
  const countOf = COUNT_KEY[metric];
  const counts = days.map((day) => countOf(day));
  const max = Math.max(1, ...counts);

  return days.map((day, i) => {
    const count = counts[i];
    // Five levels: 0 = empty, 1–4 quantised by quartiles of the year's max.
    const level =
      count === 0
        ? 0
        : count / max > 0.75
          ? 4
          : count / max > 0.5
            ? 3
            : count / max > 0.25
              ? 2
              : 1;
    return { date: day.date, count, level };
  });
}

type SpendingHeatmapProps = {
  fmt: (value: number) => string;
};

export function SpendingHeatmap({ fmt }: SpendingHeatmapProps) {
  const [metric, setMetric] = useState<Metric>("cashflow");
  const [year, setYear] = useState(CURRENT_YEAR);
  const { yearlySeries, isPending } = useAnalyticsYearlySeries({ year });

  const availableYears = useMemo(
    () => yearlySeries?.availableYears ?? [CURRENT_YEAR],
    [yearlySeries],
  );
  const loaded = yearlySeries !== undefined;

  const prevYear = useMemo(() => {
    const older = availableYears.filter((y) => y < year).sort((a, b) => b - a);
    return older[0] ?? null;
  }, [availableYears, year]);

  const nextYear = useMemo(() => {
    const newer = availableYears.filter((y) => y > year && y <= CURRENT_YEAR).sort((a, b) => a - b);
    return newer[0] ?? null;
  }, [availableYears, year]);

  const calendarData = useMemo(() => {
    if (!yearlySeries) return [];
    return buildData(yearlySeries.days, metric);
  }, [yearlySeries, metric]);

  const totals = yearlySeries?.totals;
  const activeDays = yearlySeries?.activeDays ?? 0;

  const headline = useMemo(() => {
    if (metric === "income") {
      return { value: fmt(totals?.income ?? 0), label: `income in ${year}`, tone: "text-emerald-600" };
    }
    if (metric === "expense") {
      return { value: fmt(totals?.expense ?? 0), label: `spent in ${year}`, tone: "text-rose-600" };
    }
    const net = totals?.net ?? 0;
    return {
      value: `${net > 0 ? "+" : ""}${fmt(net)}`,
      label: `net cashflow in ${year}`,
      tone: net > 0 ? "text-emerald-600" : net < 0 ? "text-rose-600" : "text-foreground",
    };
  }, [metric, totals, year, fmt]);

  // Augment each day with income/expense detail so the tooltip can show both.
  const dayDetail = useMemo(() => {
    const map = new Map<string, { income: number; expense: number }>();
    for (const day of yearlySeries?.days ?? []) {
      map.set(day.date, day);
    }
    return map;
  }, [yearlySeries]);

  const theme = THEME[metric];
  const isLoading = isPending || !yearlySeries;

  return (
    <Card>
      <CardHeader className="pb-0">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="text-sm font-semibold">Activity heatmap</CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Every day of the year, income and expense
            </CardDescription>
          </div>

          <div className="flex items-center gap-0.5 rounded-lg border p-0.5">
            <Button
              variant="ghost"
              size="icon-xs"
              aria-label="Previous year"
              disabled={!loaded || prevYear === null}
              onClick={() => prevYear !== null && setYear(prevYear)}
            >
              <ChevronLeftIcon />
            </Button>
            <span className="min-w-9 text-center text-xs font-medium tabular-nums">{year}</span>
            <Button
              variant="ghost"
              size="icon-xs"
              aria-label="Next year"
              disabled={!loaded || nextYear === null}
              onClick={() => nextYear !== null && setYear(nextYear)}
            >
              <ChevronRightIcon />
            </Button>
          </div>
        </div>

        <Tabs value={metric} onValueChange={(v) => setMetric(v as Metric)}>
          <TabsList className="mt-2">
            <TabsTrigger value="cashflow">Cashflow</TabsTrigger>
            <TabsTrigger value="income">Income</TabsTrigger>
            <TabsTrigger value="expense">Expense</TabsTrigger>
          </TabsList>
        </Tabs>
      </CardHeader>

      <CardContent className="px-2 pb-3 pt-4 sm:px-4">
        <div className="flex items-baseline gap-2">
          <span className={cn("text-xl font-semibold tabular-nums", headline.tone)}>
            {isLoading ? "—" : headline.value}
          </span>
          <span className="text-xs text-muted-foreground">{headline.label}</span>
        </div>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          {isLoading
            ? "Loading…"
            : activeDays === 0
              ? `No activity recorded in ${year}`
              : `${activeDays} active day${activeDays === 1 ? "" : "s"}`}
        </p>

        <div className="mt-4 overflow-x-auto">
          {isLoading ? (
            <Skeleton className="h-[148px] w-full" />
          ) : (
            <ActivityCalendar
              data={calendarData}
              blockSize={13}
              blockMargin={3}
              blockRadius={3}
              weekStart={0}
              colorScheme="light"
              theme={theme}
              showMonthLabels
              showWeekdayLabels={false}
              showColorLegend
              labels={{
                totalCount: `{{count}} ${metric === "income" ? "income" : metric === "expense" ? "expense" : "transactions"} in {{year}}`,
                legend: { less: "Less", more: "More" },
              }}
              tooltips={{
                activity: {
                  text: (activity) => {
                    const detail = dayDetail.get(activity.date);
                    const date = new Date(activity.date + "T00:00:00");
                    const label = date.toLocaleDateString(undefined, {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    });
                    if (!detail) return `${label} — no activity`;
                    if (metric === "cashflow") {
                      return `${label}\nin ${fmt(detail.income)} · out ${fmt(detail.expense)}`;
                    }
                    if (metric === "income") {
                      return `${label}\n+${fmt(detail.income)}`;
                    }
                    return `${label}\n−${fmt(detail.expense)}`;
                  },
                },
              }}
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
