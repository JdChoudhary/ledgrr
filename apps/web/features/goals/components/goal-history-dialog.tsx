"use client";

import { format } from "date-fns";
import {
  ArrowDownRight,
  ArrowUpRight,
} from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";

import { useGoalContributions, type GoalRecord } from "~/hooks/api/goal";

const money = (value: number, currency: string): string =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(value);

interface GoalHistoryDialogProps {
  goal: GoalRecord | null;
  spaceCurrency: string;
  onOpenChange: (open: boolean) => void;
}

/** Deposit/withdrawal history for one goal, newest first. */
export function GoalHistoryDialog({
  goal,
  spaceCurrency,
  onOpenChange,
}: GoalHistoryDialogProps) {
  const contributions = useGoalContributions(
    goal ? { goalId: goal.id } : undefined,
  );

  return (
    <Dialog open={!!goal} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>History — {goal?.name}</DialogTitle>
          <DialogDescription>
            Every deposit and withdrawal you&apos;ve made, tracked separately
            from transactions.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-80 space-y-2 overflow-y-auto">
          {contributions.isPending ? (
            <>
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </>
          ) : (contributions.contributions ?? []).length === 0 ? (
            <p className="text-muted-foreground py-8 text-center text-sm">
              No deposits or withdrawals yet
            </p>
          ) : (
            (contributions.contributions ?? []).map((contribution) => (
              <div
                key={contribution.id}
                className="flex items-center gap-3 border-b py-2 last:border-0"
              >
                <div
                  className={`flex size-8 items-center justify-center rounded-full ${
                    contribution.type === "deposit"
                      ? "bg-emerald-500/10"
                      : "bg-amber-500/10"
                  }`}
                >
                  {contribution.type === "deposit" ? (
                    <ArrowUpRight className="size-4 text-emerald-500" />
                  ) : (
                    <ArrowDownRight className="size-4 text-amber-500" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium capitalize">
                    {contribution.type}
                  </p>
                  {contribution.note ? (
                    <p className="text-muted-foreground truncate text-xs">
                      {contribution.note}
                    </p>
                  ) : null}
                </div>
                <div className="text-right">
                  <p
                    className={`text-sm font-bold ${
                      contribution.type === "deposit"
                        ? "text-emerald-600"
                        : "text-amber-600"
                    }`}
                  >
                    {contribution.type === "deposit" ? "+" : "−"}
                    {money(Number(contribution.amount), spaceCurrency)}
                  </p>
                  <p className="text-muted-foreground text-[10px]">
                    {format(new Date(contribution.createdAt), "MMM d, yyyy HH:mm")}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
