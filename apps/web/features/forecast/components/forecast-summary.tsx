import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface ForecastSummaryProps {
  predictedTotal: number;
  overallTrend: "up" | "down" | "stable";
  categoriesTracked: number;
  fmt: (amount: number) => string;
}

export function ForecastSummary({
  predictedTotal,
  overallTrend,
  categoriesTracked,
  fmt,
}: ForecastSummaryProps) {
  const TrendIcon =
    overallTrend === "up"
      ? TrendingUp
      : overallTrend === "down"
        ? TrendingDown
        : Minus;
  const trendColor =
    overallTrend === "up"
      ? "text-red-500"
      : overallTrend === "down"
        ? "text-green-500"
        : "text-muted-foreground";

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Predicted Next 3 Months
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{fmt(predictedTotal)}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Overall Trend
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <TrendIcon className={`h-5 w-5 ${trendColor}`} />
            <span className="text-2xl font-bold capitalize">
              {overallTrend}
            </span>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Categories Tracked
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {categoriesTracked}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
