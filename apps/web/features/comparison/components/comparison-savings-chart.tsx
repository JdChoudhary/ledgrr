"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { EChartsBarChart } from "@/components/evilcharts/charts/echarts-bar-chart";
import { chartConfig } from "@/features/comparison/lib/constants";
import type { MonthData } from "@/features/comparison/lib/types";

interface ComparisonSavingsChartProps {
  monthlyData: MonthData[];
  fmt: (amount: number) => string;
}

export function ComparisonSavingsChart({
  monthlyData,
  fmt,
}: ComparisonSavingsChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Savings Trend</CardTitle>
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
          <EChartsBarChart.Bar dataKey="savings" />
        </EChartsBarChart>
      </CardContent>
    </Card>
  );
}