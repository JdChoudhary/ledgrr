import { DashboardHeader } from "@/features/dashboard/components/dashboard-header";
import { AnalyticsPage } from "@/features/analytics/components/analytics-page";
import { InsightsDateRange, resolveInsightsRange } from "@/features/insights";

type InsightsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function InsightsOverviewPage({ searchParams }: InsightsPageProps) {
  const range = resolveInsightsRange(await searchParams);

  return (
    <>
      <DashboardHeader
        title="Insights"
        description="Financial analytics and trends at a glance"
        actions={<InsightsDateRange {...range} />}
      />

      <AnalyticsPage fromDate={range.fromDate} toDate={range.toDate} />
    </>
  );
}
