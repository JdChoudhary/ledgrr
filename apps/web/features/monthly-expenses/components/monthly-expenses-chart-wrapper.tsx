"use client";

import MonthlyExpensesChart from "@/components/monthlyChart";
import { useUserSettings } from "~/hooks/api/user-settings";
import { useAnalyticsOverview } from "~/hooks/api/analytics";

const fmtCurrency = (currency: string) => (value: number): string =>
  new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);

type MonthlyExpensesChartWrapperProps = {
  fromDate: string;
  toDate: string;
};

export function MonthlyExpensesChartWrapper({
  fromDate,
  toDate,
}: MonthlyExpensesChartWrapperProps) {
  const { userSettings } = useUserSettings({});
  const currency = userSettings?.displayCurrency ?? "USD";

  const { overview, isLoading } = useAnalyticsOverview({ fromDate, toDate });

  return (
    <MonthlyExpensesChart
      rows={overview?.byMonth}
      isLoading={isLoading}
      fmt={fmtCurrency(currency)}
    />
  );
}
