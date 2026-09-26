import { DashboardHeader } from "@/features/dashboard/components/dashboard-header";
import { ForecastPage } from "@/features/forecast/components/forecast-page";
import { InsightsDateRange, resolveInsightsRange } from "@/features/insights";

type InsightsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ForecastPageWrapper({ searchParams }: InsightsPageProps) {
  const range = resolveInsightsRange(await searchParams);

  return (
    <>
      <DashboardHeader
        title="Forecast"
        description="Predicted spending based on your historical patterns"
        actions={<InsightsDateRange {...range} />}
      />

      <ForecastPage fromDate={range.fromDate} toDate={range.toDate} />
    </>
  );
}
