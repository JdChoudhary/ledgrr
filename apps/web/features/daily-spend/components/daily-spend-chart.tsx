"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { EChartsBarChart } from "@/components/evilcharts/charts/echarts-bar-chart";
import { Calendar } from "lucide-react";
import { chartConfig } from "@/features/daily-spend/lib/constants";
import type { DailySpending } from "@/features/daily-spend/lib/types";

interface DailySpendChartProps {
  dailySpending: DailySpending[];
}

export function DailySpendChart({ dailySpending }: DailySpendChartProps) {
  return (
    <Card className="border-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Spending over time</CardTitle>
      </CardHeader>
      <CardContent className="px-2 sm:p-6">
        {dailySpending.length > 0 ? (
          <EChartsBarChart
            data={dailySpending}
            config={chartConfig}
            xDataKey="date"
            barRadius={4}
            className="aspect-auto h-70 w-full"
          >
            <EChartsBarChart.Grid />
            <EChartsBarChart.XAxis
              dataKey="date"
              tickFormatter={(value) => {
                const date = new Date(value);
                return date.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                });
              }}
            />
            <EChartsBarChart.YAxis />
            <EChartsBarChart.Tooltip variant="frosted-glass" />
            <EChartsBarChart.Bar dataKey="totalSpending" />
          </EChartsBarChart>
        ) : (
          <div className="h-70 flex flex-col items-center justify-center text-muted-foreground gap-2">
            <Calendar className="h-8 w-8 opacity-50" />
            <p className="text-sm">No spending data for this period</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}