"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/currency";
import { format, subMonths } from "date-fns";
import { ComparisonChangeCards } from "./comparison-change-cards";
import { ComparisonIncomeExpenseChart } from "./comparison-income-expense-chart";
import { ComparisonSavingsChart } from "./comparison-savings-chart";
import { ComparisonCategoryChart } from "./comparison-category-chart";
import type { MonthData, CategoryComparison } from "@/features/comparison/lib/types";

interface AnalyticsResponse {
  daily: { date: string; income: number; expense: number }[];
  categories: { name: string; color: string; total: number }[];
}

export function ComparisonPage() {
  const { data: analytics, isLoading: analyticsLoading } = useQuery<AnalyticsResponse>({
    queryKey: ["analytics", "comparison"],
    queryFn: () => api.get("/api/analytics/dashboard?months=6"),
  });

  const { data: currencySettings } = useQuery<{
    currency?: string; currencySymbol?: string; locale?: string;
  } | null>({
    queryKey: ["settings"],
    queryFn: () => api.get("/api/settings"),
    throwOnError: false,
  });

  const fmt = (amount: number) => formatCurrency(amount, currencySettings);

  const { monthlyData, categoryComparison } = useMemo(() => {
    const daily = analytics?.daily ?? [];
    const cats = analytics?.categories ?? [];
    const now = new Date();
    const months: MonthData[] = [];

    // Aggregate daily → monthly
    for (let i = 5; i >= 0; i--) {
      const monthDate = subMonths(now, i);
      const monthStr = format(monthDate, "yyyy-MM");
      const monthLabel = format(monthDate, "MMM yyyy");

      const monthDays = daily.filter((d) => d.date.startsWith(monthStr));
      const income = monthDays.reduce((s, d) => s + d.income, 0);
      const expenses = monthDays.reduce((s, d) => s + d.expense, 0);

      months.push({ month: monthStr, monthLabel, income, expenses, savings: income - expenses });
    }

    // Category comparison: current vs previous month
    const currentMonth = format(now, "yyyy-MM");
    const previousMonth = format(subMonths(now, 1), "yyyy-MM");

    // Use category data for current month (already filtered by the API)
    const currentByCategory: Record<string, number> = {};
    for (const c of cats) {
      currentByCategory[c.name] = (currentByCategory[c.name] || 0) + c.total;
    }

    // For previous month, we'd need a separate query — approximate from daily data
    const prevCats: Record<string, number> = {};
    // The categories endpoint returns current month only, so previous is approximate
    // We'll use a simplified comparison
    const allCategories = new Set([...Object.keys(currentByCategory)]);

    const comparison: CategoryComparison[] = Array.from(allCategories)
      .map((cat) => ({
        category: cat,
        current: currentByCategory[cat] || 0,
        previous: 0, // Will be filled when we add month-specific category data
      }))
      .sort((a, b) => b.current - a.current);

    return { monthlyData: months, categoryComparison: comparison };
  }, [analytics]);

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
        fmt={fmt}
      />
      <ComparisonIncomeExpenseChart monthlyData={monthlyData} fmt={fmt} />
      <ComparisonSavingsChart monthlyData={monthlyData} fmt={fmt} />
      <ComparisonCategoryChart categoryComparison={categoryComparison} fmt={fmt} />
    </div>
  );
}
