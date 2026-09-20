import type { ChartConfig } from "@/components/evilcharts/ui/echarts-chart";

export const chartConfig = {
  income: {
    label: "Income",
    colors: {
      light: ["#22c55e"],
      dark: ["#22c55e"],
    },
  },
  expenses: {
    label: "Expenses",
    colors: {
      light: ["#ef4444"],
      dark: ["#ef4444"],
    },
  },
  savings: {
    label: "Savings",
    colors: {
      light: ["#3b82f6"],
      dark: ["#3b82f6"],
    },
  },
} satisfies ChartConfig;

export const categoryChartConfig = {
  current: {
    label: "This Month",
    colors: {
      light: ["#3b82f6"],
      dark: ["#3b82f6"],
    },
  },
  previous: {
    label: "Last Month",
    colors: {
      light: ["#94a3b8"],
      dark: ["#94a3b8"],
    },
  },
} satisfies ChartConfig;
