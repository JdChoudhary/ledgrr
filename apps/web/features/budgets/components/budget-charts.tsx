"use client";

import * as React from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Label,
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

const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

export type BudgetChartRow = {
  name: string;
  budgetId: string;
  budget: number;
  spent: number;
  categoryId: string | null;
};

type Props = {
  chartRows: BudgetChartRow[];
  totalBudget: number;
  totalSpending: number;
  percentUsed: number;
  currency: string;
};

const fmt =
  (currency: string) =>
  (value: number): string =>
    new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(value);

// ── Budget utilization donut ────────────────────────────────
function BudgetUtilizationDonut({
  totalBudget,
  totalSpending,
  percentUsed,
  currency,
}: Omit<Props, "chartRows">) {
  const pct = percentUsed;
  const remaining = Math.max(totalBudget - totalSpending, 0);
  const overBy = totalSpending > totalBudget ? totalSpending - totalBudget : 0;
  const color =
    pct > 100 ? "#ef4444" : pct > 80 ? "#f59e0b" : "#22c55e";

  const donutData = [
    { name: "Spent", value: Math.max(totalSpending, 0.01), fill: color },
    { name: "Remaining", value: Math.max(remaining, 0.01), fill: "var(--muted)" },
  ];

  return (
    <Card>
      <CardHeader className="pb-0">
        <CardTitle className="text-sm font-semibold">Budget Utilization</CardTitle>
        <CardDescription className="text-xs text-muted-foreground">
          Overall budget usage this period
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 items-center justify-center px-2 pb-2 sm:px-4">
        <div className="flex flex-col items-center gap-6 sm:flex-row">
          <div className="relative h-40 w-40 shrink-0">
            <ChartContainer
              config={
                {
                  spent: { label: "Spent" },
                  remaining: { label: "Remaining" },
                } satisfies ChartConfig
              }
              className="aspect-square h-40 w-40"
            >
              <PieChart>
                <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                <Pie
                  data={donutData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={52}
                  outerRadius={70}
                  strokeWidth={0}
                >
                  {donutData.map((entry) => (
                    <Cell key={entry.name} fill={entry.fill} />
                  ))}
                </Pie>
              </PieChart>
            </ChartContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span
                className={cn(
                  "text-2xl font-bold tabular-nums",
                  pct > 100 ? "text-red-500" : pct > 80 ? "text-amber-500" : "text-emerald-500",
                )}
              >
                {Math.round(pct)}%
              </span>
              <span className="text-[10px] text-muted-foreground">used</span>
            </div>
          </div>
          <div className="min-w-0 flex-1 space-y-2.5 sm:w-44">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Spent</span>
              <span className="font-medium tabular-nums">{fmt(currency)(totalSpending)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Budget</span>
              <span className="font-medium tabular-nums">{fmt(currency)(totalBudget)}</span>
            </div>
            <div className="h-px bg-border" />
            {overBy > 0 ? (
              <div className="flex justify-between text-xs">
                <span className="text-red-500">Over by</span>
                <span className="font-medium text-red-500 tabular-nums">
                  {fmt(currency)(overBy)}
                </span>
              </div>
            ) : (
              <div className="flex justify-between text-xs">
                <span className="text-emerald-500">Remaining</span>
                <span className="font-medium text-emerald-500 tabular-nums">
                  {fmt(currency)(remaining)}
                </span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Category utilization bars ───────────────────────────────
function CategoryUtilizationBars({
  chartRows,
  currency,
}: Pick<Props, "chartRows" | "currency">) {
  const data = [...chartRows]
    .map((row) => ({
      ...row,
      pct: row.budget > 0 ? Math.round((row.spent / row.budget) * 100) : 0,
    }))
    .sort((a, b) => b.pct - a.pct);

  return (
    <Card>
      <CardHeader className="pb-0">
        <CardTitle className="text-sm font-semibold">Category Breakdown</CardTitle>
        <CardDescription className="text-xs text-muted-foreground">
          Usage per budgeted category
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col px-2 pb-2 sm:px-4">
        {data.length > 0 ? (
          <div className="my-auto w-full space-y-4">
            {data.map((cat, i) => (
              <div key={cat.budgetId} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex min-w-0 items-center gap-2">
                    <div
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
                    />
                    <span className="truncate font-medium">{cat.name}</span>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="tabular-nums text-muted-foreground">
                      {fmt(currency)(cat.spent)} / {fmt(currency)(cat.budget)}
                    </span>
                    <span
                      className={cn(
                        "w-10 text-right font-semibold tabular-nums",
                        cat.pct > 100 ? "text-red-500" : cat.pct > 80 ? "text-amber-500" : "text-emerald-500",
                      )}
                    >
                      {cat.pct}%
                    </span>
                  </div>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-muted/70">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(cat.pct, 100)}%`,
                      backgroundColor:
                        cat.pct > 100
                          ? "#ef4444"
                          : cat.pct > 80
                            ? "#f59e0b"
                            : CHART_COLORS[i % CHART_COLORS.length],
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="my-auto py-8 text-center text-sm text-muted-foreground">
            No budgets set yet
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Budget vs actual by category ────────────────────────────
function BudgetVsActualChart({
  chartRows,
  currency,
}: Pick<Props, "chartRows" | "currency">) {
  const data = chartRows
    .filter((r) => r.budget > 0 || r.spent > 0)
    .map((r) => ({ ...r, shortName: r.name.length > 12 ? r.name.slice(0, 12) + "…" : r.name }));

  const config = {
    budget: { label: "Budget", color: "var(--chart-1)" },
    spent: { label: "Spent", color: "var(--chart-2)" },
  } satisfies ChartConfig;

  return (
    <Card>
      <CardHeader className="pb-0">
        <CardTitle className="text-sm font-semibold">
          Budget vs Actual by Category
        </CardTitle>
        <CardDescription className="text-xs text-muted-foreground">
          Planned budget compared with actual spending per category
        </CardDescription>
      </CardHeader>
      <CardContent className="px-2 pb-2 sm:px-4">
        {data.length > 0 ? (
          <div className="h-[280px]">
            <ChartContainer config={config} className="h-full w-full">
              <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16 }}>
                <CartesianGrid horizontal={false} />
                <XAxis
                  type="number"
                  tickFormatter={(v) => fmt(currency)(Number(v))}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis dataKey="shortName" type="category" tickLine={false} axisLine={false} width={90} />
                <ChartTooltip
                  content={<ChartTooltipContent indicator="line" />}
                />
                <Bar dataKey="budget" radius={4} />
                <Bar dataKey="spent" radius={4} />
              </BarChart>
            </ChartContainer>
          </div>
        ) : (
          <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
            No category data
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Variance chart ──────────────────────────────────────────
function CategoryVarianceChart({
  chartRows,
  currency,
}: Pick<Props, "chartRows" | "currency">) {
  const data = chartRows
    .filter((r) => r.budget > 0)
    .map((r) => ({
      name: r.name.length > 12 ? r.name.slice(0, 12) + "…" : r.name,
      variance: r.budget - r.spent,
      isOver: r.spent > r.budget,
    }))
    .sort((a, b) => a.variance - b.variance);

  const config = {
    variance: { label: "Variance", color: "var(--chart-3)" },
  } satisfies ChartConfig;

  return (
    <Card>
      <CardHeader className="pb-0">
        <CardTitle className="text-sm font-semibold">Budget Variance</CardTitle>
        <CardDescription className="text-xs text-muted-foreground">
          Green = under budget, Red = over budget
        </CardDescription>
      </CardHeader>
      <CardContent className="px-2 pb-2 sm:px-4">
        {data.length > 0 ? (
          <div className="h-[280px]">
            <ChartContainer config={config} className="h-full w-full">
              <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16 }}>
                <CartesianGrid horizontal={false} />
                <XAxis
                  type="number"
                  tickFormatter={(v) => fmt(currency)(Number(v))}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis dataKey="name" type="category" tickLine={false} axisLine={false} width={90} />
                <ChartTooltip content={<ChartTooltipContent indicator="line" />} />
                <Bar dataKey="variance" radius={4}>
                  {data.map((entry) => (
                    <Cell
                      key={entry.name}
                      fill={entry.isOver ? "#ef4444" : "#22c55e"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
          </div>
        ) : (
          <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
            Set budgets to see variance
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Main export ─────────────────────────────────────────────
export function BudgetCharts({
  chartRows,
  totalBudget,
  totalSpending,
  percentUsed,
  currency,
}: Props) {
  return (
    <div className="space-y-4">
      {/* Row 1: Donut + Trend placeholder slot kept minimal */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <BudgetUtilizationDonut
          totalBudget={totalBudget}
          totalSpending={totalSpending}
          percentUsed={percentUsed}
          currency={currency}
        />
        <CategoryUtilizationBars chartRows={chartRows} currency={currency} />
      </div>

      {/* Row 2: Variance + Budget vs Actual */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <CategoryVarianceChart chartRows={chartRows} currency={currency} />
        <BudgetVsActualChart chartRows={chartRows} currency={currency} />
      </div>
    </div>
  );
}
