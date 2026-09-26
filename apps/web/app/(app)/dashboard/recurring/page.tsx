import { DashboardHeader } from "@/features/dashboard/components/dashboard-header";
import { RecurringPage } from "@/features/recurring";

export default function RecurringDashboardPage() {
  return (
    <>
      <DashboardHeader
        title="Recurring"
        description="Upcoming occurrences and all recurring rules"
      />

      <div className="p-4 md:p-6">
        <RecurringPage />
      </div>
    </>
  );
}
