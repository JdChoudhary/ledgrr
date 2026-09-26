"use client";

import { useMemo } from "react";
import { format, subMonths } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { useAnalyticsDashboardData } from "~/hooks/api/analytics";
import { useSpaces } from "~/hooks/api/space";
import { ComparisonChangeCards } from "./comparison-change-cards";
import { ComparisonIncomeExpenseChart } from "./comparison-income-expense-chart";
import { ComparisonSavingsChart } from "./comparison-savings-chart";
import { ComparisonCategoryChart } from "./comparison-category-chart";
import type { MonthData, CategoryComparison } from "@/features/comparison/lib/types";

const fmtCurrency = (currency: string) => (value: number): string =>
  new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);

type ComparisonPageProps = {
  fromDate: string;
  toDate: string;
};

export function ComparisonPage({ fromDate, toDate }: ComparisonPageProps) {
  const spaces = useSpaces({});
  const space = spaces.spaces?.[0]?.space;
  const spaceId = space?.id;
  const currency = space?.baseCurrency ?? "USD";

  const { dashboardData, isLoading: analyticsLoading } = useAnalyticsDashboardData(
    spaceId ? { spaceId, fromDate, toDate } : undefined,
  );

  const money = fmtCurrency(currency);

  const { monthlyData, categoryComparison } = useMemo(() => {
    const daily = dashboardData?.daily ?? [];
    const cats = dashboardData?.categories ?? [];
    const now = new Date();
    const months: MonthData[] = [];

    // Aggregate daily → monthly
    for (let i = 5; i >= 0; i--) {
      const monthDate = subMonths(now, i);
      const monthStr = format(monthDate, "yyyy-MM");
      const monthLabel = format(monthDate, "MMM yyyy");

      const monthDays = daily.filter((d: any) => d.date.startsWith(monthStr));
      const income = monthDays.reduce((s: number, d: any) => s + d.income, 0);
      const expenses = monthDays.reduce((s: number, d: any) => s + d.expense, 0);

      months.push({ month: monthStr, monthLabel, income, expenses, savings: income - expenses });
    }

    // Category comparison: current vs previous month
    const currentByCategory: Record<string, number> = {};
    for (const c of cats) {
      currentByCategory[c.name] = (currentByCategory[c.name] || 0) + c.total;
    }

    const allCategories = new Set([...Object.keys(currentByCategory)]);

    const comparison: CategoryComparison[] = Array.from(allCategories)
      .map((cat) => ({
        category: cat,
        current: currentByCategory[cat] || 0,
        previous: 0,
      }))
      .sort((a, b) => b.current - a.current);

    return { monthlyData: months, categoryComparison: comparison };
  }, [dashboardData]);

  const currentMonthData = monthlyData[monthlyData.length - 1];
  const previousMonthData = monthlyData[monthlyData.length - 2];

  const incomeChange =
    previousMonthData && previousMonthData.income > 0
      ? ((currentMonthData?.income - previousMonthData.income) / previousMonthData.income) * 100
      : 0;
  const expenseChange =
    previousMonthData && previousMonthData.expenses > 0
      ? ((currentMonthData?.expenses - previousMonthData.expenses) / previousMonthData.expenses) * 100
      : 0;

  if (analyticsLoading) {
    return (
      <div className="container mx-auto p-4 md:p-6 max-w-5xl space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 sm:grid-cols-2"><Skeleton className="h-32 rounded-2xl" /><Skeleton className="h-32 rounded-2xl" /></div>
        <Skeleton className="h-80 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6 max-w-5xl space-y-6">
      <ComparisonChangeCards
        currentMonthData={currentMonthData}
        previousMonthData={previousMonthData}
        incomeChange={incomeChange}
        expenseChange={expenseChange}
        fmt={money}
      />
      <ComparisonIncomeExpenseChart monthlyData={monthlyData} fmt={money} />
      <ComparisonSavingsChart monthlyData={monthlyData} fmt={money} />
      <ComparisonCategoryChart categoryComparison={categoryComparison} fmt={money} />
    </div>
  );
}
