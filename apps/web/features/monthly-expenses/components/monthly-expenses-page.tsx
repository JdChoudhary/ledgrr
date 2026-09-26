"use client";

import { MonthlyExpensesHeader } from "./monthly-expenses-header";
import { MonthlyExpensesChartWrapper } from "./monthly-expenses-chart-wrapper";

type MonthlyExpensesPageProps = {
  fromDate: string;
  toDate: string;
};

export function MonthlyExpensesPage({ fromDate, toDate }: MonthlyExpensesPageProps) {
  return (
    <div className="space-y-4 p-4 md:p-6 max-w-5xl mx-auto">
      <MonthlyExpensesHeader />
      <MonthlyExpensesChartWrapper fromDate={fromDate} toDate={toDate} />
    </div>
  );
}
