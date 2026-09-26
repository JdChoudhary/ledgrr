import { NotificationProvider, NotificationBar } from "@/features/dashboard/components/notification-bar";
import { SearchCommand } from "@/features/dashboard/components/search-command";
import { DashboardShell } from "@/features/dashboard/components/dashboard-shell";
import { MobileContextTabs } from "@/features/dashboard/components/mobile-context-tabs";
import { MobileNavigation } from "@/features/dashboard/components/mobile-navigation";
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <NotificationProvider>
      <DashboardShell>
        <MobileContextTabs />

        {/* Mobile search trigger — always visible above content */}
        <div className="flex items-center gap-2 border-b px-4 py-2 md:hidden">
          <SearchCommand />
        </div>

        <div className="pb-20 md:pb-0">{children}</div>

        <NotificationBar />
        <MobileNavigation />
      </DashboardShell>
    </NotificationProvider>
  );
}
