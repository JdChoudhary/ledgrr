import { DashboardHeader } from "@/features/dashboard/components/dashboard-header";
import { ComparisonPage } from "@/features/comparison/components/comparison-page";
import { InsightsDateRange, resolveInsightsRange } from "@/features/insights";

type InsightsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function CashFlowPage({ searchParams }: InsightsPageProps) {
  const range = resolveInsightsRange(await searchParams);

  return (
    <>
      <DashboardHeader
        title="Cash Flow"
        description="Month-over-month income vs expenses comparison"
        actions={<InsightsDateRange {...range} />}
      />

      <ComparisonPage fromDate={range.fromDate} toDate={range.toDate} />
    </>
  );
}
