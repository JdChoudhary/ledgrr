import { DashboardHeader } from "@/features/dashboard/components/dashboard-header";
import { MonthlyExpensesPage } from "@/features/monthly-expenses/components/monthly-expenses-page";
import { InsightsDateRange, resolveInsightsRange } from "@/features/insights";

type InsightsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function MonthlyExpensesPageWrapper({ searchParams }: InsightsPageProps) {
  const range = resolveInsightsRange(await searchParams);

  return (
    <>
      <DashboardHeader
        title="Monthly Expenses"
        description="Breakdown of your spending by month"
        actions={<InsightsDateRange {...range} />}
      />

      <MonthlyExpensesPage fromDate={range.fromDate} toDate={range.toDate} />
    </>
  );
}
