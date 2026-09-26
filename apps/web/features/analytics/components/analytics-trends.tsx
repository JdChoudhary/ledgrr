import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { TrendingUp } from "lucide-react";
import type { AnalyticsData } from "@/features/analytics/lib/types";

interface AnalyticsTrendsProps {
  byMonth: AnalyticsData["byMonth"];
  fmt: (amount: number) => string;
}

export function AnalyticsTrends({ byMonth, fmt }: AnalyticsTrendsProps) {
  if (byMonth.length === 0) return null;

  const maxVal = Math.max(
    ...byMonth.map((x) => Math.max(x.income, x.expenses)),
    1
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Monthly Trends
        </CardTitle>
        <CardDescription>Income vs expenses over time</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {byMonth.map((m) => {
            const incomeWidth = (m.income / maxVal) * 100;
            const expenseWidth = (m.expenses / maxVal) * 100;

            return (
              <div key={m.month} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{m.month}</span>
                  <span
                    className={m.net >= 0 ? "text-emerald-600" : "text-red-600"}
                  >
                    {m.net >= 0 ? "+" : ""}
                    {fmt(m.net)}
                  </span>
                </div>
                <div className="flex gap-1">
                  <div
                    className="h-4 rounded bg-emerald-500/70"
                    style={{ width: `${incomeWidth}%` }}
                  />
                  <div
                    className="h-4 rounded bg-red-500/70"
                    style={{ width: `${expenseWidth}%` }}
                  />
                </div>
              </div>
            );
          })}
          <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2">
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-emerald-500/70" /> Income
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-red-500/70" /> Expenses
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
