import { Wallet } from "lucide-react";

import { DashboardHeader } from "@/features/dashboard/components/dashboard-header";
import { AccountsView } from "@/features/accounts/components/accounts-view";

export default function AccountsPage() {
  return (
    <>
      <DashboardHeader
        title="Accounts"
        description="Track balances across your cash, bank, and card accounts"
        actions={
          <span className="flex items-center gap-2 text-xs text-muted-foreground">
            <Wallet className="size-4" />
            Balances update as transactions are posted
          </span>
        }
      />

      <div className="p-4 md:p-6">
        <AccountsView />
      </div>
    </>
  );
}
