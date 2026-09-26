"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EChartsAreaChart } from "@/components/evilcharts/charts/echarts-area-chart";
import { type ChartConfig } from "@/components/evilcharts/ui/echarts-chart";
import {
  ChevronLeft,
  ChevronRight,
  Zap,
  Target,
  TrendingUp,
  TrendingDown,
  Calendar,
} from "lucide-react";
import type { ProjectionBaseline, ProjectionChartRow } from "../lib/types";

const chartConfig = {
  optimistic: {
    label: "Best Case",
    colors: { light: ["#10b981"], dark: ["#10b981"] },
  },
  pessimistic: {
    label: "Worst Case",
    colors: { light: ["#ef4444"], dark: ["#ef4444"] },
  },
  actual: {
    label: "Actual",
    colors: { light: ["#10b981"], dark: ["#10b981"] },
  },
  projected: {
    label: "Projected",
    colors: { light: ["#6366f1"], dark: ["#6366f1"] },
  },
} satisfies ChartConfig;

interface ProjectionChartProps {
  data: ProjectionChartRow[];
  baseline: ProjectionBaseline | undefined;
  projectionMonths: number;
  loading: boolean;
  fmt: (amount: number) => string;
  onDecreaseMonths: () => void;
  onIncreaseMonths: () => void;
}

export function ProjectionChart({
  data,
  baseline,
  projectionMonths,
  loading,
  fmt,
  onDecreaseMonths,
  onIncreaseMonths,
}: ProjectionChartProps) {
  return (
    <Card className="border-border/40">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm font-semibold tracking-tight">
              Net Worth Projection
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Based on recurring income, expenses &amp; budgets
            </p>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={onDecreaseMonths}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <span className="text-xs text-muted-foreground min-w-[3rem] text-center">
              {projectionMonths} mo
            </span>
            <Button
              variant="outline"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={onIncreaseMonths}
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-64 rounded-xl" />
        ) : data.length > 0 ? (
          <>
            <EChartsAreaChart
              data={data}
              config={chartConfig}
              xDataKey="name"
              className="h-72 w-full"
            >
              <EChartsAreaChart.Grid />
              <EChartsAreaChart.XAxis dataKey="name" />
              <EChartsAreaChart.YAxis
                tickFormatter={(v) =>
                  Math.abs(v) >= 1000
                    ? `${(v / 1000).toFixed(0)}k`
                    : `${v.toFixed(0)}`
                }
              />
              <EChartsAreaChart.Tooltip variant="frosted-glass" />
              <EChartsAreaChart.Legend variant="circle" />
              <EChartsAreaChart.Area
                dataKey="optimistic"
                variant="gradient"
                curveType="monotone"
              />
              <EChartsAreaChart.Area
                dataKey="pessimistic"
                variant="gradient"
                curveType="monotone"
              />
              <EChartsAreaChart.Area
                dataKey="actual"
                variant="none"
                curveType="monotone"
                strokeWidth={2.5}
                connectNulls={false}
              >
                <EChartsAreaChart.Dot variant="border" />
                <EChartsAreaChart.ActiveDot variant="default" />
              </EChartsAreaChart.Area>
              <EChartsAreaChart.Area
                dataKey="projected"
                variant="none"
                strokeVariant="dashed"
                curveType="monotone"
                connectNulls={false}
              >
                <EChartsAreaChart.ActiveDot variant="default" />
              </EChartsAreaChart.Area>
            </EChartsAreaChart>

            {baseline && (
              <ProjectionSummary baseline={baseline} fmt={fmt} />
            )}
          </>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <TrendingUp className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">
              Add recurring transactions to see your net worth projection
            </p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              Set up salary, rent, subscriptions and more in Recurring
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ProjectionSummary({
  baseline,
  fmt,
}: {
  baseline: ProjectionBaseline;
  fmt: (amount: number) => string;
}) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
      <div className="rounded-xl border border-border/40 bg-background p-3">
        <div className="flex items-center gap-1.5 mb-1">
          <Zap className="h-3 w-3 text-blue-500" />
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
            Monthly Income
          </span>
        </div>
        <p className="text-sm font-bold text-blue-600">
          {fmt(baseline.monthlyIncome)}
        </p>
      </div>
      <div className="rounded-xl border border-border/40 bg-background p-3">
        <div className="flex items-center gap-1.5 mb-1">
          <Target className="h-3 w-3 text-red-500" />
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
            Monthly Expenses
          </span>
        </div>
        <p className="text-sm font-bold text-red-600">
          {fmt(baseline.monthlyExpenses)}
        </p>
      </div>
      <div className="rounded-xl border border-border/40 bg-background p-3">
        <div className="flex items-center gap-1.5 mb-1">
          {baseline.monthlyNetFlow >= 0 ? (
            <TrendingUp className="h-3 w-3 text-emerald-500" />
          ) : (
            <TrendingDown className="h-3 w-3 text-red-500" />
          )}
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
            Net Flow / Month
          </span>
        </div>
        <p
          className={`text-sm font-bold ${
            baseline.monthlyNetFlow >= 0
              ? "text-emerald-600"
              : "text-red-600"
          }`}
        >
          {baseline.monthlyNetFlow >= 0 ? "+" : ""}
          {fmt(baseline.monthlyNetFlow)}
        </p>
      </div>
      <div className="rounded-xl border border-border/40 bg-background p-3">
        <div className="flex items-center gap-1.5 mb-1">
          <Calendar className="h-3 w-3 text-purple-500" />
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
            Recurring Rules
          </span>
        </div>
        <p className="text-sm font-bold text-purple-600">
          {baseline.recurringRuleCount}
        </p>
      </div>
    </div>
  );
}
