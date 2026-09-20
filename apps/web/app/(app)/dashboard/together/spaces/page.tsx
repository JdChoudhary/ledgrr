import { DashboardHeader } from "@/features/dashboard/components/dashboard-header";
import { SpacesView } from "@/features/spaces";

export default function SpacesPage() {
  return (
    <>
      <DashboardHeader
        title="Spaces"
        description="Create shared money spaces, manage members and roles"
      />

      <div className="p-4 md:p-6">
        <SpacesView />
      </div>
    </>
  );
}
