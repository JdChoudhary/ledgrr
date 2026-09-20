"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { EChartsBarChart } from "@/components/evilcharts/charts/echarts-bar-chart";
import { categoryChartConfig } from "@/features/comparison/lib/constants";
import type { CategoryComparison } from "@/features/comparison/lib/types";

interface ComparisonCategoryChartProps {
  categoryComparison: CategoryComparison[];
  fmt: (amount: number) => string;
}

export function ComparisonCategoryChart({
  categoryComparison,
  fmt,
}: ComparisonCategoryChartProps) {
  if (categoryComparison.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">
          Category Comparison: This Month vs Last Month
        </CardTitle>
      </CardHeader>
      <CardContent className="px-2 sm:p-6">
        <EChartsBarChart
          data={categoryComparison}
          config={categoryChartConfig}
          xDataKey="category"
          layout="horizontal"
          barRadius={4}
          className="h-87.5 w-full"
        >
          <EChartsBarChart.Grid />
          <EChartsBarChart.XAxis tickFormatter={(v) => fmt(Number(v))} />
          <EChartsBarChart.YAxis dataKey="category" />
          <EChartsBarChart.Tooltip variant="frosted-glass" />
          <EChartsBarChart.Legend variant="circle" />
          <EChartsBarChart.Bar dataKey="current" />
          <EChartsBarChart.Bar dataKey="previous" />
        </EChartsBarChart>
      </CardContent>
    </Card>
  );
}