"use client";

import { useMemo } from "react";
import { format } from "date-fns";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  ReferenceLine,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowDownRightIcon,
  ArrowUpRightIcon,
  RepeatIcon,
  SparklesIcon,
  TrendingUpIcon,
} from "lucide-react";

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

type ForecastHistoryRow = {
  month: string;
  income: number;
  expense: number;
  netFlow: number;
};

type ForecastProjectionRow = {
  month: string;
  netFlow: number;
  projectedNetWorth: number;
};

export type NetWorthForecastData = {
  currency: string;
  currentNetWorth: number;
  history: ForecastHistoryRow[];
  avgMonthlySavings: number;
  recurringIncome: number;
  recurringExpense: number;
  projectedMonthlyNet: number;
  projection: ForecastProjectionRow[];
  basis: "recurring" | "history" | "thin";
};

type NetWorthForecastCardProps = {
  forecast: NetWorthForecastData | undefined;
  isLoading: boolean;
};

const BASIS_LABEL: Record<NetWorthForecastData["basis"], string> = {
  recurring: "Based on your recurring rules + recent months",
  history: "Based on your last few months",
  thin: "Not enough data yet — add transactions or recurring rules",
};

const monthLabel = (key: string): string => {
  const [y, m] = key.split("-").map(Number);
  return format(new Date(y, (m ?? 1) - 1, 1), "MMM yy");
};

export function NetWorthForecastCard({
  forecast,
  isLoading,
}: NetWorthForecastCardProps) {
  const chartRows = useMemo(() => {
    if (!forecast) return [];
    const history = forecast.history.map((h) => ({
      month: h.month,
      label: monthLabel(h.month),
      actual: null as number | null,
      projected: null as number | null,
      isProjection: false,
    }));
    if (history.length > 0) {
      // Bridge point: today's net worth closes the history series.
      history[history.length - 1] = {
        ...history[history.length - 1]!,
        actual: forecast.currentNetWorth,
      };
    }
    const projection = forecast.projection.map((p, i) => ({
      month: p.month,
      label: monthLabel(p.month),
      actual: null as number | null,
      projected: p.projectedNetWorth,
      isProjection: true,
      ...(i === 0 ? { actual: forecast.currentNetWorth } : {}),
    }));
    return [...history, ...projection];
  }, [forecast]);

  const config = {
    actual: { label: "Net worth", color: "var(--chart-2)" },
    projected: { label: "Projected", color: "var(--chart-1)" },
  } satisfies ChartConfig;

  const trendUp = (forecast?.projectedMonthlyNet ?? 0) >= 0;
  const isThin = forecast?.basis === "thin";

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-0">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-3 w-64" />
        </CardHeader>
        <CardContent className="px-2 pb-2 sm:px-4">
          <Skeleton className="h-[220px]" />
        </CardContent>
      </Card>
    );
  }

  if (!forecast || chartRows.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-0">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <TrendingUpIcon className="size-4" />
              Net worth forecast
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              {BASIS_LABEL[forecast.basis]}
            </CardDescription>
          </div>
          <div className="flex items-center gap-3 text-right">
            <div>
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                Today
              </p>
              <p className="text-sm font-semibold tabular-nums">
                {fmtShort(forecast.currentNetWorth, forecast.currency)}
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                In {forecast.projection.length} mo
              </p>
              <p
                className={cn(
                  "text-sm font-semibold tabular-nums",
                  trendUp ? "text-emerald-600" : "text-red-600",
                )}
              >
                {fmtShort(
                  forecast.projection[forecast.projection.length - 1]
                    ?.projectedNetWorth ?? forecast.currentNetWorth,
                  forecast.currency,
                )}
              </p>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-2 pb-2 sm:px-4">
        {isThin ? (
          <div className="flex h-[180px] flex-col items-center justify-center gap-2 text-center">
            <SparklesIcon className="size-5 text-muted-foreground" />
            <p className="max-w-sm text-sm text-muted-foreground">
              Add a few months of transactions — or set up recurring rules for
              salary and bills — to unlock a reliable forecast.
            </p>
          </div>
        ) : (
          <>
            <div className="h-[220px]">
              <ChartContainer config={config} className="h-full w-full">
                <AreaChart
                  data={chartRows}
                  margin={{ left: 4, right: 8, top: 8 }}
                >
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis
                    dataKey="label"
                    tickLine={false}
                    axisLine={false}
                    minTickGap={24}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    width={60}
                    tickFormatter={(v) =>
                      fmtShort(Number(v), forecast.currency)
                    }
                  />
                  <ChartTooltip
                    content={<ChartTooltipContent indicator="line" />}
                  />
                  <Area
                    type="monotone"
                    dataKey="actual"
                    stroke="var(--color-actual)"
                    fill="var(--color-actual)"
                    fillOpacity={0.08}
                    strokeWidth={2}
                    connectNulls={false}
                    dot={false}
                  />
                  <Area
                    type="monotone"
                    dataKey="projected"
                    stroke="var(--color-projected)"
                    strokeDasharray="6 4"
                    fill="var(--color-projected)"
                    fillOpacity={0.06}
                    strokeWidth={2}
                    connectNulls={false}
                    dot={false}
                  />
                </AreaChart>
              </ChartContainer>
            </div>

            {/* Forecast drivers */}
            <div className="mt-2 grid grid-cols-1 gap-2 border-t pt-3 sm:grid-cols-3">
              <div className="flex items-center gap-2">
                <span className="flex size-7 items-center justify-center rounded-full bg-emerald-500/10">
                  <ArrowUpRightIcon className="size-3.5 text-emerald-600" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-[11px] text-muted-foreground">
                    Recurring income /mo
                  </p>
                  <p className="text-xs font-medium tabular-nums">
                    {fmtShort(forecast.recurringIncome, forecast.currency)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="flex size-7 items-center justify-center rounded-full bg-red-500/10">
                  <ArrowDownRightIcon className="size-3.5 text-red-600" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-[11px] text-muted-foreground">
                    Recurring expenses /mo
                  </p>
                  <p className="text-xs font-medium tabular-nums">
                    {fmtShort(forecast.recurringExpense, forecast.currency)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="flex size-7 items-center justify-center rounded-full bg-muted">
                  <RepeatIcon className="size-3.5 text-muted-foreground" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-[11px] text-muted-foreground">
                    Projected net /mo
                  </p>
                  <p
                    className={cn(
                      "text-xs font-medium tabular-nums",
                      trendUp ? "text-emerald-600" : "text-red-600",
                    )}
                  >
                    {fmtShort(forecast.projectedMonthlyNet, forecast.currency)}
                  </p>
                </div>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

const fmtShort = (value: number, currency: string): string =>
  new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    notation: Math.abs(value) >= 10000 ? "compact" : "standard",
    maximumFractionDigits: 0,
  }).format(value);
