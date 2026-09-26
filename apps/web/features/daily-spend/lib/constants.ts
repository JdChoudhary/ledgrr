import type { ChartConfig } from "@/components/evilcharts/ui/echarts-chart";

export const chartConfig = {
  totalSpending: {
    label: "Total Spending",
    colors: {
      light: ["var(--chart-1)"],
      dark: ["var(--chart-1)"],
    },
  },
} satisfies ChartConfig;
