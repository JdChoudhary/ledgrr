"use client";

import { Receipt, UsersThree } from "@phosphor-icons/react";
import { formatCurrency } from "@/lib/currency";
import type { BillSplit } from "@/features/bill-splits/lib/types";

interface BillSplitListProps {
  splits: BillSplit[];
  fmt: (amount: number) => string;
  onSelect: (id: string) => void;
}

export function BillSplitList({ splits, fmt, onSelect }: BillSplitListProps) {
  const safeSplits = Array.isArray(splits) ? splits : [];

  if (safeSplits.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Receipt className="h-8 w-8 text-muted-foreground/50 mb-3" weight="light" />
        <p className="text-sm font-medium">No bill splits yet</p>
        <p className="text-xs text-muted-foreground mt-1">
          Create a split to share expenses with friends.
        </p>
      </div>
    );
  }

  // Compute status for each split
  const getSplitStatus = (s: BillSplit) => {
    const shares = (s as any).shares || [];
    if (shares.length === 0) return { label: "Active", color: "text-muted-foreground" };
    const paidCount = shares.filter((sh: any) => sh.isPaid).length;
    const totalCount = shares.length;
    if (paidCount === totalCount) return { label: "Settled", color: "text-emerald-600 dark:text-emerald-400" };
    if (paidCount > 0) return { label: "Partial", color: "text-amber-600 dark:text-amber-400" };
    return { label: "Outstanding", color: "text-muted-foreground" };
  };

  return (
    <div className="rounded-lg border border-border/50 overflow-hidden">
      {safeSplits.map((s) => {
        const status = getSplitStatus(s);
        const shares = (s as any).shares || [];
        const paidCount = shares.filter((sh: any) => sh.isPaid).length;

        return (
          <div
            key={s.id}
            className="group flex items-center gap-3 px-4 py-3 border-b border-border/20 last:border-0 cursor-pointer hover:bg-muted/20 transition-colors duration-150"
            onClick={() => onSelect(s.id)}
          >
            {/* Icon */}
            <div className="w-8 h-8 rounded-md bg-muted/30 flex items-center justify-center shrink-0">
              <Receipt className="h-4 w-4 text-muted-foreground" weight="duotone" />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium truncate leading-tight">
                {s.title}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[11px] text-muted-foreground">
                  {new Date(s.date).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}
                </span>
                <span className="text-[11px] text-muted-foreground">·</span>
                <span className="text-[11px] text-muted-foreground capitalize">
                  {s.splitMethod} split
                </span>
                {shares.length > 0 && (
                  <>
                    <span className="text-[11px] text-muted-foreground">·</span>
                    <span className="text-[11px] text-muted-foreground">
                      {paidCount}/{shares.length} paid
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Amounts */}
            <div className="text-right shrink-0">
              <p className="text-[13px] font-semibold tabular-nums">
                {fmt(s.totalAmount)}
              </p>
              <p className={`text-[10px] font-medium ${status.color}`}>
                {status.label}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
