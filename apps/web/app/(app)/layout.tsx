import { DashboardShell } from "@/features/dashboard/components/dashboard-shell";
import { MobileContextTabs } from "@/features/dashboard/components/mobile-context-tabs";
import { MobileNavigation } from "@/features/dashboard/components/mobile-navigation";
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardShell>
      <MobileContextTabs />

      <div className="pb-20 md:pb-0">{children}</div>

      <MobileNavigation />
    </DashboardShell>
  );
}