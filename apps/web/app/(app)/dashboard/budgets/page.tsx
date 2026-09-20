import { Target } from "lucide-react";

import { DashboardHeader } from "@/features/dashboard/components/dashboard-header";
import { BudgetsView } from "@/features/budgets/components/budgets-view";

export default function BudgetsPage() {
  return (
    <>
      <DashboardHeader
        title="Budgets"
        description="See how your spending compares to your budgets"
        actions={
          <span className="flex items-center gap-2 text-xs text-muted-foreground">
            <Target className="size-4" />
            Live spend from posted transactions
          </span>
        }
      />

      <div className="p-4 md:p-6">
        <BudgetsView />
      </div>
    </>
  );
}
