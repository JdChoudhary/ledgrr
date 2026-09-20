import { Target } from "lucide-react";

import { DashboardHeader } from "@/features/dashboard/components/dashboard-header";
import { GoalsView } from "@/features/goals/components/goals-view";

export default function GoalsPage() {
  return (
    <>
      <DashboardHeader
        title="Goals"
        description="Track progress toward your savings targets"
        actions={
          <span className="flex items-center gap-2 text-xs text-muted-foreground">
            <Target className="size-4" />
            Progress from posted transactions
          </span>
        }
      />

      <div className="p-4 md:p-6">
        <GoalsView />
      </div>
    </>
  );
}
