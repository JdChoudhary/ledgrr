"use client";

import { MonthlyExpensesHeader } from "./monthly-expenses-header";
import { MonthlyExpensesChartWrapper } from "./monthly-expenses-chart-wrapper";

export function MonthlyExpensesPage() {
  return (
    <div className="space-y-4 p-4 md:p-6 max-w-5xl mx-auto">
      <MonthlyExpensesHeader />
      <MonthlyExpensesChartWrapper />
    </div>
  );
}
