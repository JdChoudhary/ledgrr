"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EChartsAreaChart } from "@/components/evilcharts/charts/echarts-area-chart";
import { type ChartConfig } from "@/components/evilcharts/ui/echarts-chart";
import { Camera } from "lucide-react";

const chartConfig = {
  total: {
    label: "Net Worth",
    colors: { light: ["#10b981"], dark: ["#10b981"] },
  },
} satisfies ChartConfig;

interface HistoryChartProps {
  data: { date: string; total: number }[];
  fmt: (amount: number) => string;
  onTakeSnapshot: () => void;
}

export function HistoryChart({ data, fmt, onTakeSnapshot }: HistoryChartProps) {
  if (data.length <= 1) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Camera className="h-10 w-10 mx-auto mb-3 opacity-30" />
        <p className="text-sm">
          Take snapshots to track your net worth over time
        </p>
        <Button
          variant="outline"
          size="sm"
          className="mt-3 gap-1.5"
          onClick={onTakeSnapshot}
        >
          <Camera className="h-3.5 w-3.5" />
          Take first snapshot
        </Button>
      </div>
    );
  }

  return (
    <Card className="border-border/40">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold tracking-tight">
          Net Worth History
        </CardTitle>
      </CardHeader>
      <CardContent>
        <EChartsAreaChart
          data={data}
          config={chartConfig}
          xDataKey="date"
          className="h-64 w-full"
        >
          <EChartsAreaChart.Grid />
          <EChartsAreaChart.XAxis dataKey="date" />
          <EChartsAreaChart.YAxis
            tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
          />
          <EChartsAreaChart.Tooltip variant="frosted-glass" />
          <EChartsAreaChart.Area
            dataKey="total"
            variant="gradient"
            curveType="monotone"
            strokeWidth={2}
          >
            <EChartsAreaChart.Dot variant="border" />
          </EChartsAreaChart.Area>
        </EChartsAreaChart>
      </CardContent>
    </Card>
  );
}
