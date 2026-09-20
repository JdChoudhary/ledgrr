"use client";

import { SetMonthlyBudgetDialog } from "@/components/addCategoryBudget";
import { Button } from "@/components/ui/button";
import { Wallet, Plus } from "lucide-react";
import {
  DateRangeFilter,
  type DateRange,
} from "@/components/dateRangeFilter";

interface DashboardActionsProps {
  dateRange: DateRange;
  onDateRangeChange: (value: DateRange) => void;
  onQuickAdd: () => void;
}

export function DashboardActions({
  dateRange,
  onDateRangeChange,
  onQuickAdd,
}: DashboardActionsProps) {
  return (
    <>
      <DateRangeFilter value={dateRange} onChange={onDateRangeChange} />
      <SetMonthlyBudgetDialog
        trigger={
          <Button
            variant="outline"
            size="sm"
            className="h-9 gap-1.5 rounded-full border-border/60 hover:bg-muted/50 hover:border-border transition-all duration-300"
          >
            <Wallet className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Budget</span>
          </Button>
        }
      />
      <Button
        size="sm"
        className="h-9 gap-1.5 rounded-full bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all duration-300 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-px active:scale-[0.98]"
        onClick={onQuickAdd}
      >
        <Plus className="h-3.5 w-3.5" />
        Add Transaction
      </Button>
    </>
  );
}
