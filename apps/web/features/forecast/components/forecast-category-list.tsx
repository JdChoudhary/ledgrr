import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus, ArrowRight } from "lucide-react";
import type { CategoryForecast } from "@/features/forecast/lib/types";

interface ForecastCategoryListProps {
  categoryForecasts: CategoryForecast[];
  fmt: (amount: number) => string;
}

export function ForecastCategoryList({
  categoryForecasts,
  fmt,
}: ForecastCategoryListProps) {
  if (categoryForecasts.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Category Forecasts</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {categoryForecasts.map((cf) => {
            const CatTrendIcon =
              cf.trend === "up"
                ? TrendingUp
                : cf.trend === "down"
                  ? TrendingDown
                  : Minus;
            const catTrendColor =
              cf.trend === "up"
                ? "text-red-500"
                : cf.trend === "down"
                  ? "text-green-500"
                  : "text-muted-foreground";

            return (
              <div
                key={cf.category}
                className="flex items-center justify-between py-3 border-b last:border-0"
              >
                <div className="flex items-center gap-3">
                  <CatTrendIcon className={`h-4 w-4 ${catTrendColor}`} />
                  <div>
                    <p className="font-medium text-sm">{cf.category}</p>
                    <p className="text-xs text-muted-foreground">
                      Avg: {fmt(cf.currentAvg)}/mo
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold">
                    <ArrowRight className="inline h-3 w-3 mx-1 text-muted-foreground" />
                    {fmt(cf.predictedNext)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {cf.confidence}% confidence
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
