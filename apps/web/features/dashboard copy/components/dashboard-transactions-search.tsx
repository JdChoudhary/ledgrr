"use client";

import MonthlyComparisonBadge from "@/components/monthly-comparison-badge";
import DashboardSearch from "@/components/dashboard-search";
import type {
  Transaction,
  CurrencySettings,
} from "@/features/dashboard/lib/types";

interface DashboardTransactionsSearchProps {
  transactions: Transaction[];
  currencySettings: CurrencySettings | null | undefined;
}

export function DashboardTransactionsSearch({
  transactions,
  currencySettings,
}: DashboardTransactionsSearchProps) {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
      <MonthlyComparisonBadge
        transactions={transactions}
        currencySettings={currencySettings}
      />
      <DashboardSearch
        transactions={transactions}
        currencySettings={currencySettings}
      />
    </div>
  );
}
