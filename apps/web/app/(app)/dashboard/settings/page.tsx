import { DashboardHeader } from "@/features/dashboard/components/dashboard-header";
import { SettingsView } from "@/features/settings";

export default function SettingsPage() {
  return (
    <>
      <DashboardHeader
        title="Settings"
        description="Manage your profile, security and preferences"
      />

      <div className="p-4 md:p-6">
        <SettingsView />
      </div>
    </>
  );
}
