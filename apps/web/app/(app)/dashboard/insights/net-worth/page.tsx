import { DashboardHeader } from "@/features/dashboard/components/dashboard-header";
import { NetWorthPage } from "@/features/net-worth/components/net-worth-page";
import { InsightsDateRange, resolveInsightsRange } from "@/features/insights";

type InsightsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function NetWorthPageWrapper({ searchParams }: InsightsPageProps) {
  const range = resolveInsightsRange(await searchParams);

  return (
    <>
      <DashboardHeader
        title="Net Worth"
        description="Track your total wealth over time"
        actions={<InsightsDateRange {...range} />}
      />

      <NetWorthPage />
    </>
  );
}
