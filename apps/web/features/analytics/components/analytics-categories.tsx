import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LayoutGrid, TrendingUp } from "lucide-react";
import type { AnalyticsData } from "@/features/analytics/lib/types";

interface AnalyticsCategoriesProps {
  expenseByCategory: AnalyticsData["byCategory"];
  incomeByCategory: AnalyticsData["byCategory"];
  maxExpense: number;
  fmt: (amount: number) => string;
}

export function AnalyticsCategories({
  expenseByCategory,
  incomeByCategory,
  maxExpense,
  fmt,
}: AnalyticsCategoriesProps) {
  const maxIncome = Math.max(...incomeByCategory.map((c) => c.total), 1);

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LayoutGrid className="h-5 w-5" />
            Spending by Category
          </CardTitle>
          <CardDescription>Where your money goes</CardDescription>
        </CardHeader>
        <CardContent>
          {expenseByCategory.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No expenses this period
            </p>
          ) : (
            <div className="space-y-3">
              {expenseByCategory.map((cat) => (
                <div
                  key={cat.categoryId || "uncategorized"}
                  className="space-y-1"
                >
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <span
                        className="h-2 w-2 rounded-full shrink-0"
                        style={{ backgroundColor: cat.categoryColor }}
                      />
                      {cat.categoryName}
                    </span>
                    <span className="font-medium">{fmt(cat.total)}</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${(cat.total / maxExpense) * 100}%`,
                        backgroundColor: cat.categoryColor,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Income by Source
          </CardTitle>
          <CardDescription>Where your money comes from</CardDescription>
        </CardHeader>
        <CardContent>
          {incomeByCategory.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No income this period
            </p>
          ) : (
            <div className="space-y-3">
              {incomeByCategory.map((cat) => (
                <div
                  key={cat.categoryId || "uncategorized"}
                  className="space-y-1"
                >
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <span
                        className="h-2 w-2 rounded-full shrink-0"
                        style={{ backgroundColor: cat.categoryColor }}
                      />
                      {cat.categoryName}
                    </span>
                    <span className="font-medium">{fmt(cat.total)}</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all bg-emerald-500"
                      style={{ width: `${(cat.total / maxIncome) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
