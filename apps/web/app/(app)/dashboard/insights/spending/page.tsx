import { DashboardHeader } from "@/features/dashboard/components/dashboard-header";
import { DailySpendPage } from "@/features/daily-spend/components/daily-spend-page";
import { InsightsDateRange, resolveInsightsRange } from "@/features/insights";

type InsightsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function SpendingPage({ searchParams }: InsightsPageProps) {
  const range = resolveInsightsRange(await searchParams);

  return (
    <>
      <DashboardHeader
        title="Spending"
        description="Track where your money goes each day"
        actions={<InsightsDateRange {...range} />}
      />

      <DailySpendPage fromDate={range.fromDate} toDate={range.toDate} />
    </>
  );
}
