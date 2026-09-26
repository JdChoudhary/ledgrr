"use client";

import { useMemo } from "react";
import { format, addMonths } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { useAnalyticsDashboardData } from "~/hooks/api/analytics";
import { useSpaces } from "~/hooks/api/space";
import { ForecastSummary } from "./forecast-summary";
import { ForecastChart } from "./forecast-chart";
import { ForecastCategoryList } from "./forecast-category-list";
import type { ForecastPoint, CategoryForecast } from "@/features/forecast/lib/types";

const fmtCurrency = (currency: string) => (value: number): string =>
  new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);

const generateForecast = (
  daily: Array<{ date: string; income: number; expense: number }>,
  cats: Array<{ name: string; color: string; total: number }>,
): { forecastData: ForecastPoint[]; categoryForecasts: CategoryForecast[] } => {
  const now = new Date();

  // Aggregate daily → monthly expenses
  const monthlyExpenses: Record<string, number> = {};
  for (const d of daily) {
    const month = d.date.slice(0, 7);
    monthlyExpenses[month] = (monthlyExpenses[month] || 0) + d.expense;
  }

  const sortedMonths = Object.keys(monthlyExpenses).sort();
  const last6Months = sortedMonths.slice(-6);

  const actualData: ForecastPoint[] = last6Months.map((month) => ({
    month: format(new Date(month + "-01"), "MMM yyyy"),
    actual: monthlyExpenses[month],
  }));

  const values = last6Months.map((m) => monthlyExpenses[m]);
  const avg = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
  const stdDev =
    values.length > 1
      ? Math.sqrt(values.reduce((sum, v) => sum + Math.pow(v - avg, 2), 0) / values.length)
      : avg * 0.15;

  const trend = values.length >= 2 ? (values[values.length - 1] - values[0]) / values.length : 0;

  for (let i = 1; i <= 3; i++) {
    const futureDate = addMonths(now, i);
    const predicted = avg + trend * i;
    const variance = stdDev * Math.sqrt(i) * 1.96;
    actualData.push({
      month: format(futureDate, "MMM yyyy"),
      predicted: Math.max(0, predicted),
      lowerBound: Math.max(0, predicted - variance),
      upperBound: predicted + variance,
    });
  }

  // Category forecasts
  const catForecasts: CategoryForecast[] = cats
    .map((c) => ({
      category: c.name,
      currentAvg: c.total,
      predictedNext: c.total * 1.02,
      trend: "stable" as const,
      confidence: 75,
    }))
    .sort((a, b) => b.currentAvg - a.currentAvg);

  return { forecastData: actualData, categoryForecasts: catForecasts };
};

type ForecastPageProps = {
  fromDate: string;
  toDate: string;
};

export function ForecastPage({ fromDate, toDate }: ForecastPageProps) {
  const spaces = useSpaces({});
  const space = spaces.spaces?.[0]?.space;
  const spaceId = space?.id;
  const currency = space?.baseCurrency ?? "USD";

  const { dashboardData, isLoading } = useAnalyticsDashboardData(
    spaceId ? { spaceId, fromDate, toDate } : undefined,
  );

  const money = fmtCurrency(currency);

  const { forecastData, categoryForecasts } = useMemo(
    () => (dashboardData ? generateForecast(dashboardData.daily, dashboardData.categories) : { forecastData: [], categoryForecasts: [] }),
    [dashboardData],
  );

  const predictedTotal = forecastData
    .filter((d) => d.predicted !== undefined)
    .reduce((sum, d) => sum + (d.predicted || 0), 0);

  const lastActual = forecastData.find((d) => d.actual !== undefined);
  const firstPredicted = forecastData.find((d) => d.predicted !== undefined);

  const overallTrend =
    lastActual && firstPredicted && lastActual.actual && firstPredicted.predicted
      ? firstPredicted.predicted > lastActual.actual
        ? "up"
        : firstPredicted.predicted < lastActual.actual
          ? "down"
          : "stable"
      : "stable";

  if (isLoading) {
    return (
      <div className="container mx-auto p-4 md:p-6 max-w-5xl space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 rounded-2xl" />
        <Skeleton className="h-80 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6 max-w-5xl space-y-6">
      <ForecastSummary predictedTotal={predictedTotal} overallTrend={overallTrend} categoriesTracked={categoryForecasts.length} fmt={money} />
      <ForecastChart forecastData={forecastData} fmt={money} />
      <ForecastCategoryList categoryForecasts={categoryForecasts} fmt={money} />
    </div>
  );
}
