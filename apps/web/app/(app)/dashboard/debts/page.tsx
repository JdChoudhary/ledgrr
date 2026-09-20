import { HandCoinsIcon } from "lucide-react";

import { DashboardHeader } from "@/features/dashboard/components/dashboard-header";
import { DebtsView } from "@/features/debts/components/debts-view";

export default function DebtsPage() {
  return (
    <>
      <DashboardHeader
        title="Debts"
        description="Outstanding obligations between you, friends and space members"
        actions={
          <span className="flex items-center gap-2 text-xs text-muted-foreground">
            <HandCoinsIcon className="size-4" />
            Settlements never count as income or expense
          </span>
        }
      />

      <div className="p-4 md:p-6">
        <DebtsView />
      </div>
    </>
  );
}
