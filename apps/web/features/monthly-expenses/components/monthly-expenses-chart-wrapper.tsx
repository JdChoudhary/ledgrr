"use client";

import MonthlyExpensesChart from "@/components/monthlyChart";
import { useSpaces } from "~/hooks/api/space";
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
  const spaces = useSpaces({});
  const space = spaces.spaces?.[0]?.space;
  const spaceId = space?.id;
  const currency = space?.baseCurrency ?? "USD";

  const { overview, isLoading } = useAnalyticsOverview(
    spaceId ? { spaceId, fromDate, toDate } : undefined,
  );

  return (
    <MonthlyExpensesChart
      rows={overview?.byMonth}
      isLoading={isLoading}
      fmt={fmtCurrency(currency)}
    />
  );
}
