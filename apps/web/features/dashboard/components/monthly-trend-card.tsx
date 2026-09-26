"use client";

import { format } from "date-fns";
import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts";
import { TrendingUpIcon } from "lucide-react";

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

export type MonthlyTrendRow = {
  month: string;
  income: number;
  expense: number;
  net: number;
};

type MonthlyTrendCardProps = {
  rows: MonthlyTrendRow[];
  isLoading: boolean;
  fmt: (value: number) => string;
};

const config = {
  income: { label: "Income", color: "var(--chart-2)" },
  expense: { label: "Expense", color: "var(--chart-1)" },
} satisfies ChartConfig;

const monthLabel = (key: string): string => {
  const [y, m] = key.split("-").map(Number);
  return format(new Date(y, (m ?? 1) - 1, 1), "MMM");
};

export function MonthlyTrendCard({ rows, isLoading, fmt }: MonthlyTrendCardProps) {
  const data = rows.map((r) => ({ ...r, label: monthLabel(r.month) }));
  const hasData = data.some((d) => d.income > 0 || d.expense > 0);

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-0">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-3 w-56" />
        </CardHeader>
        <CardContent className="px-2 pb-2 sm:px-4">
          <Skeleton className="h-[220px]" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-0">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <TrendingUpIcon className="size-4" />
          Monthly expenses & income
        </CardTitle>
        <CardDescription className="text-xs text-muted-foreground">
          Last {rows.length} months — the runway behind your forecast
        </CardDescription>
      </CardHeader>
      <CardContent className="px-2 pb-2 sm:px-4">
        {!hasData ? (
          <div className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">
            No monthly data yet
          </div>
        ) : (
          <div className="h-[220px]">
            <ChartContainer config={config} className="h-full w-full">
              <BarChart data={data} margin={{ left: 4, right: 8 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  width={60}
                  tickFormatter={(v) => fmt(Number(v))}
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
  );
}
