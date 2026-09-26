"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts";
import { CalendarDaysIcon } from "lucide-react";

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
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "cn";

export type DailySpendData = {
  currency: string;
  todaySpend: number;
  monthSpend: number;
  monthDailyAverage: number;
  weekdayAverages: number[];
  highestWeekday: string | null;
  lowestWeekday: string | null;
};

type DailySpendCardProps = {
  dailySpend: DailySpendData | undefined;
  isLoading: boolean;
  fmt: (value: number) => string;
};

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

const config = {
  average: { label: "Avg spend", color: "var(--chart-3)" },
} satisfies ChartConfig;

export function DailySpendCard({ dailySpend, isLoading, fmt }: DailySpendCardProps) {
  const data = (dailySpend?.weekdayAverages ?? []).map((avg, i) => ({
    day: WEEKDAYS[i] ?? `d${i}`,
    average: Number(avg.toFixed(2)),
    isToday: false,
  }));

  const hasPattern = data.some((d) => d.average > 0);
  const today = new Date().getDay();

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-0">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-3 w-52" />
        </CardHeader>
        <CardContent className="px-2 pb-2 sm:px-4">
          <Skeleton className="h-[160px]" />
        </CardContent>
      </Card>
    );
  }

  if (!dailySpend) return null;

  const vsAvg = dailySpend.monthDailyAverage > 0
    ? dailySpend.todaySpend / dailySpend.monthDailyAverage
    : 0;

  return (
    <Card>
      <CardHeader className="pb-0">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <CalendarDaysIcon className="size-4" />
          Daily spend
        </CardTitle>
        <CardDescription className="text-xs text-muted-foreground">
          Today vs your typical week
        </CardDescription>
      </CardHeader>
      <CardContent className="px-2 pb-2 sm:px-4">
        <div className="mb-3 grid grid-cols-3 gap-2">
          <div className="rounded-lg border px-2.5 py-2">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
              Today
            </p>
            <p className="text-sm font-semibold tabular-nums">
              {fmt(dailySpend.todaySpend)}
            </p>
            <p
              className={cn(
                "text-[10px]",
                vsAvg > 1.25
                  ? "text-red-600"
                  : vsAvg > 0 && vsAvg <= 1.25
                    ? "text-emerald-600"
                    : "text-muted-foreground",
              )}
            >
              {vsAvg > 0
                ? vsAvg > 1.25
                  ? "above your average"
                  : "within your average"
                : "nothing yet"}
            </p>
          </div>
          <div className="rounded-lg border px-2.5 py-2">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
              This month
            </p>
            <p className="text-sm font-semibold tabular-nums">
              {fmt(dailySpend.monthSpend)}
            </p>
            <p className="text-[10px] text-muted-foreground">
              {fmt(dailySpend.monthDailyAverage)}/day avg
            </p>
          </div>
          <div className="rounded-lg border px-2.5 py-2">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
              Pattern
            </p>
            <p className="truncate text-sm font-semibold">
              {dailySpend.highestWeekday ?? "—"}
            </p>
            <p className="truncate text-[10px] text-muted-foreground">
              priciest day
            </p>
          </div>
        </div>

        {hasPattern ? (
          <div className="h-[160px]">
            <ChartContainer config={config} className="h-full w-full">
              <BarChart data={data} margin={{ left: 4, right: 8 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis
                  dataKey="day"
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  width={56}
                  tickFormatter={(v) => fmt(Number(v))}
                />
                <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                <Bar dataKey="average" fill="var(--color-average)" radius={3} />
              </BarChart>
            </ChartContainer>
          </div>
        ) : (
          <div className="flex h-[120px] items-center justify-center text-sm text-muted-foreground">
            No spending pattern yet — record a few expenses.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
