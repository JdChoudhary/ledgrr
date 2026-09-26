import type { ChartConfig } from "@/components/ui/chart";

export const chartConfig = {
  actual: {
    label: "Actual",
    color: "#3b82f6",
  },
  predicted: {
    label: "Predicted",
    color: "#f59e0b",
  },
  upperBound: {
    label: "Upper Bound",
    color: "rgba(245, 158, 11, 0.15)",
  },
  lowerBound: {
    label: "Lower Bound",
    color: "rgba(245, 158, 11, 0.15)",
  },
} satisfies ChartConfig;
