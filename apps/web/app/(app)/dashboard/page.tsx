import { DashboardHeader } from "@/features/dashboard/components/dashboard-header";
import { DashboardView } from "@/features/dashboard/components/dashboard-view";

export default function DashboardPage() {
  return (
    <>
      <DashboardHeader
        title="Dashboard"
        description="A quick look at your money"
      />

      <div className="p-4 md:p-6">
        <DashboardView />
      </div>
    </>
  );
}
