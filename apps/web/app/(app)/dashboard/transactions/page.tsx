import { ReceiptTextIcon } from "lucide-react";

import { DashboardHeader } from "@/features/dashboard/components/dashboard-header";
import { TransactionsView } from "@/features/transactions/components/transactions-view";

export default function TransactionsPage() {
  return (
    <>
      <DashboardHeader
        title="Transactions"
        description="The financial source of truth — every record of actual money movement"
        actions={
          <span className="flex items-center gap-2 text-xs text-muted-foreground">
            <ReceiptTextIcon className="size-4" />
            Splits allocate shares — they never create a second ledger
          </span>
        }
      />

      <div className="p-4 md:p-6">
        <TransactionsView />
      </div>
    </>
  );
}
