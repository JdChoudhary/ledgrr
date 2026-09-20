"use client";

import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { formatCurrency, parseLocalDate } from "@/lib/currency";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Check, Clock, Users, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  Transaction,
  CurrencySettings,
  BillSplitShare,
} from "@/features/transactions/lib/types";

interface SplitDetailModalProps {
  transactionId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SplitDetailModal({
  transactionId,
  open,
  onOpenChange,
}: SplitDetailModalProps) {
  const { data: txn, isLoading } = useQuery<Transaction>({
    queryKey: ["transaction", transactionId],
    queryFn: () => api.get("/api/transactions/" + transactionId),
    enabled: open && !!transactionId,
  });

  const { data: currencySettings } = useQuery<CurrencySettings | null>({
    queryKey: ["settings"],
    queryFn: () => api.get("/api/settings"),
    throwOnError: false,
    enabled: open,
  });

  const fmt = (amount: number) => formatCurrency(amount, currencySettings);

  const shares: BillSplitShare[] = txn?.billSplitShares ?? [];
  const myShare = shares.find((s) => s.isOwner);
  const otherShares = shares.filter((s) => !s.isOwner);
  const hasUnpaid = otherShares.some((s) => !s.isPaid);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[85vh] rounded-t-2xl">
        {isLoading ? (
          <div className="p-5 space-y-4">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-20 w-full rounded-lg" />
            <Skeleton className="h-16 w-full rounded-lg" />
          </div>
        ) : !txn || !txn.billSplitShares ? (
          <div className="p-5 text-center text-muted-foreground text-sm">
            No split data available
          </div>
        ) : (
          <div className="p-5 space-y-5">
            {/* Header: description, date, category, total amount */}
            <div>
              <SheetHeader className="p-0">
                <SheetTitle className="text-base">{txn.description}</SheetTitle>
              </SheetHeader>
              <p className="text-xs text-muted-foreground mt-1">
                {format(parseLocalDate(txn.date), "MMM d, yyyy")} ·{" "}
                {txn.category?.name || "Uncategorized"}
              </p>
              <div className="flex items-baseline gap-2 mt-2">
                <p className="text-lg font-bold">{fmt(txn.amount)}</p>
                <span className="text-xs text-muted-foreground">
                  total, deducted from {txn.account?.name || "account"}
                </span>
              </div>
            </div>

            {/* Your share (emphasized) */}
            {myShare && (
              <Card className="border-primary/20 bg-primary/5">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-[11px] font-bold text-primary">
                        You
                      </div>
                      <div>
                        <p className="text-sm font-semibold">Your share</p>
                        <p className="text-[10px] text-muted-foreground">
                          Counted in your {txn.category?.name || ""} budget
                        </p>
                      </div>
                    </div>
                    <span className="text-base font-bold text-primary">
                      {fmt(myShare.amount)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Other participants */}
            {otherShares.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Other participants
                </p>
                {otherShares.map((share) => (
                  <div
                    key={share.id}
                    className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-muted/30"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-[11px] font-bold text-muted-foreground">
                        {share.userName?.[0]?.toUpperCase() || "?"}
                      </div>
                      <p className="text-sm font-medium">{share.userName}</p>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <span className="text-sm font-semibold tabular-nums">
                        {fmt(share.amount)}
                      </span>
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium",
                          share.isPaid
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                            : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                        )}
                      >
                        {share.isPaid ? (
                          <Check className="h-2.5 w-2.5" />
                        ) : (
                          <Clock className="h-2.5 w-2.5" />
                        )}
                        {share.isPaid ? "Paid" : "Unpaid"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Explainer */}
            {myShare && (
              <p className="text-xs text-muted-foreground leading-relaxed p-3 rounded-lg bg-muted/20 border border-border/30">
                Your {fmt(myShare.amount)} share is counted in your{" "}
                {txn.category?.name || "category"} budget. The rest is tracked
                separately as money owed to you.
              </p>
            )}

            {/* Actions */}
            <div className="flex gap-2">
              {hasUnpaid && txn.billSplitId && (
                <Button
                  size="sm"
                  className="flex-1 h-9 gap-1.5"
                  onClick={() => {
                    onOpenChange(false);
                    window.location.href = "/dashboard/bill-splits";
                  }}
                >
                  <Users className="h-3.5 w-3.5" />
                  Settle up
                </Button>
              )}
              {txn.billSplitId && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="flex-1 h-9 gap-1.5"
                  onClick={() => {
                    onOpenChange(false);
                    window.location.href = "/dashboard/bill-splits";
                  }}
                >
                  View full split
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
