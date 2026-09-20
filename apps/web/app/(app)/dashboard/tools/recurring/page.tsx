import { DashboardHeader } from "@/features/dashboard/components/dashboard-header";
import { RecurringPage } from "@/features/recurring";

export default function RecurringSettingsPage() {
  return (
    <>
      <DashboardHeader
        title="Recurring"
        description="Scheduled transactions — occurrences post automatically when due"
      />

      <div className="p-4 md:p-6">
        <RecurringPage />
      </div>
    </>
  );
}
