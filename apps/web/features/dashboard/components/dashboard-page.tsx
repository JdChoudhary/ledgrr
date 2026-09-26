"use client";

import * as React from "react";
import { format } from "date-fns";

import { cn } from "cn";
import { DashboardHeader } from "./dashboard-header";
import { DashboardView } from "./dashboard-view";
import { SetBudgetDialog } from "./set-budget-dialog";

type RangeKey = "this_month" | "last_month" | "custom";

const monthBounds = (offset: number): { fromDate: string; toDate: string } => {
  const now = new Date();
  return {
    fromDate: format(new Date(now.getFullYear(), now.getMonth() + offset, 1), "yyyy-MM-dd"),
    toDate: format(new Date(now.getFullYear(), now.getMonth() + offset + 1, 0), "yyyy-MM-dd"),
  };
};

const RANGES: { key: RangeKey; label: string }[] = [
  { key: "this_month", label: "This month" },
  { key: "last_month", label: "Last month" },
  { key: "custom", label: "Custom" },
];

export function DashboardPage() {
  const [range, setRange] = React.useState<RangeKey>("this_month");
  const [customFrom, setCustomFrom] = React.useState<string>(() => monthBounds(-1).fromDate);
  const [customTo, setCustomTo] = React.useState<string>(() => monthBounds(-1).toDate);

  const bounds = range === "custom"
    ? { fromDate: customFrom, toDate: customTo }
    : monthBounds(range === "this_month" ? 0 : -1);

  const actions = (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1 rounded-xl bg-muted/50 p-1">
        {RANGES.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setRange(key)}
            className={cn(
              "rounded-lg px-3 py-1.5 text-xs font-medium transition-all",
              range === key
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {range === "custom" ? (
        <div className="flex items-center gap-1 rounded-xl border border-border bg-muted/30 p-1 text-xs">
          <input
            type="date"
            value={customFrom}
            onChange={(e) => setCustomFrom(e.target.value)}
            aria-label="From date"
            className="w-32 rounded-lg bg-background px-2 py-1.5 text-foreground outline-none"
          />
          <span className="text-muted-foreground">→</span>
          <input
            type="date"
            value={customTo}
            onChange={(e) => setCustomTo(e.target.value)}
            aria-label="To date"
            className="w-32 rounded-lg bg-background px-2 py-1.5 text-foreground outline-none"
          />
        </div>
      ) : null}

      <SetBudgetDialog />
    </div>
  );

  return (
    <>
      <DashboardHeader
        title="Dashboard"
        description="A quick look at your money"
        actions={actions}
      />

      <div className="p-4 md:p-6">
        <DashboardView fromDate={bounds.fromDate} toDate={bounds.toDate} />
      </div>
    </>
  );
}