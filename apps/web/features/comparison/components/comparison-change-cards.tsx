"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import type { MonthData } from "@/features/comparison/lib/types";

interface ComparisonChangeCardsProps {
  currentMonthData?: MonthData;
  previousMonthData?: MonthData;
  incomeChange: number;
  expenseChange: number;
  fmt: (amount: number) => string;
}

export function ComparisonChangeCards({
  currentMonthData,
  previousMonthData,
  incomeChange,
  expenseChange,
  fmt,
}: ComparisonChangeCardsProps) {
  if (!currentMonthData || !previousMonthData) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Income Change
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div
            className={`text-2xl font-bold ${incomeChange >= 0 ? "text-green-600" : "text-red-600"}`}
          >
            {incomeChange >= 0 ? "+" : ""}
            {incomeChange.toFixed(1)}%
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {fmt(currentMonthData.income)} vs {fmt(previousMonthData.income)}
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Expense Change
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div
            className={`text-2xl font-bold ${expenseChange <= 0 ? "text-green-600" : "text-red-600"}`}
          >
            {expenseChange >= 0 ? "+" : ""}
            {expenseChange.toFixed(1)}%
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {fmt(currentMonthData.expenses)} vs {fmt(previousMonthData.expenses)}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
