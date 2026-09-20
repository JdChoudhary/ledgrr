"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { EChartsBarChart } from "@/components/evilcharts/charts/echarts-bar-chart";
import { chartConfig } from "@/features/comparison/lib/constants";
import type { MonthData } from "@/features/comparison/lib/types";

interface ComparisonIncomeExpenseChartProps {
  monthlyData: MonthData[];
  fmt: (amount: number) => string;
}

export function ComparisonIncomeExpenseChart({
  monthlyData,
  fmt,
}: ComparisonIncomeExpenseChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Income vs Expenses (6 Months)</CardTitle>
      </CardHeader>
      <CardContent className="px-2 sm:p-6">
        <EChartsBarChart
          data={monthlyData}
          config={chartConfig}
          xDataKey="monthLabel"
          barRadius={4}
          className="h-87.5 w-full"
        >
          <EChartsBarChart.Grid />
          <EChartsBarChart.XAxis dataKey="monthLabel" />
          <EChartsBarChart.YAxis tickFormatter={(v) => fmt(Number(v))} />
          <EChartsBarChart.Tooltip variant="frosted-glass" />
          <EChartsBarChart.Legend variant="circle" />
          <EChartsBarChart.Bar dataKey="income" />
          <EChartsBarChart.Bar dataKey="expenses" />
        </EChartsBarChart>
      </CardContent>
    </Card>
  );
}