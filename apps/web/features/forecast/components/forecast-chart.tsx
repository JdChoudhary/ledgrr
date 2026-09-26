"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { EChartsAreaChart } from "@/components/evilcharts/charts/echarts-area-chart";
import { type ChartConfig } from "@/components/evilcharts/ui/echarts-chart";
import type { ForecastPoint } from "@/features/forecast/lib/types";

const chartConfig = {
  actual: {
    label: "Actual",
    colors: { light: ["#3b82f6"], dark: ["#3b82f6"] },
  },
  predicted: {
    label: "Predicted",
    colors: { light: ["#f59e0b"], dark: ["#f59e0b"] },
  },
} satisfies ChartConfig;

interface ForecastChartProps {
  forecastData: ForecastPoint[];
  fmt: (amount: number) => string;
}

export function ForecastChart({ forecastData, fmt }: ForecastChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Monthly Spending Forecast</CardTitle>
      </CardHeader>
      <CardContent className="px-2 sm:p-6">
        <EChartsAreaChart
          data={forecastData}
          config={chartConfig}
          xDataKey="month"
          className="h-87.5 w-full"
        >
          <EChartsAreaChart.Grid />
          <EChartsAreaChart.XAxis dataKey="month" />
          <EChartsAreaChart.YAxis tickFormatter={(v) => fmt(v)} />
          <EChartsAreaChart.Tooltip variant="frosted-glass" />
          <EChartsAreaChart.Area
            dataKey="actual"
            variant="solid"
            curveType="monotone"
            strokeWidth={2}
            connectNulls={false}
          >
            <EChartsAreaChart.Dot variant="border" />
            <EChartsAreaChart.ActiveDot variant="default" />
          </EChartsAreaChart.Area>
          <EChartsAreaChart.Area
            dataKey="predicted"
            variant="none"
            strokeVariant="dashed"
            curveType="monotone"
            strokeWidth={2}
            connectNulls={false}
          >
            <EChartsAreaChart.Dot variant="border" />
            <EChartsAreaChart.ActiveDot variant="default" />
          </EChartsAreaChart.Area>
        </EChartsAreaChart>
      </CardContent>
    </Card>
  );
}
