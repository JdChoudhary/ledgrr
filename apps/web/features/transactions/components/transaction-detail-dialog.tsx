"use client";

import * as React from "react";
import { format } from "date-fns";
import {
  ArrowDownLeftIcon,
  ArrowLeftRightIcon,
  ArrowUpRightIcon,
  CheckIcon,
  ClockIcon,
  FileTextIcon,
  HashIcon,
  RepeatIcon,
  RotateCcwIcon,
  UsersIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";

import { cn } from "cn";
import { useSpaces } from "~/hooks/api/space";
import { useTransactions } from "~/hooks/api/transaction";
import { useDebts } from "~/hooks/api/debt";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type TransactionRow = NonNullable<ReturnType<typeof useTransactions>["transactions"]>[number];

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transactionId: string | null;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TYPE_META: Record<
  string,
  { icon: React.ElementType; color: string; label: string }
> = {
  income: { icon: ArrowUpRightIcon, color: "text-emerald-600", label: "Income" },
  expense: { icon: ArrowDownLeftIcon, color: "text-red-600", label: "Expense" },
  transfer: { icon: ArrowLeftRightIcon, color: "text-blue-600", label: "Transfer" },
  refund: { icon: RotateCcwIcon, color: "text-emerald-600", label: "Refund" },
};

const fmtMoney = (value: string | number, currency?: string): string => {
  const num = Number(value);
  return new Intl.NumberFormat(undefined, {
    style: currency ? "currency" : "decimal",
    currency: currency ?? "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
};

// ---------------------------------------------------------------------------
// Detail row
// ---------------------------------------------------------------------------

function DetailRow({
  label,
  icon: Icon,
  children,
}: {
  label: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted">
        <Icon className="size-3.5 text-muted-foreground" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <div className="mt-0.5">{children}</div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function TransactionDetailDialog({ open, onOpenChange, transactionId }: Props) {
  const spaces = useSpaces({});
  const space = spaces.spaces?.[0]?.space;
  const spaceId = space?.id;
  const currency = space?.baseCurrency ?? "USD";

  const transactions = useTransactions(
    spaceId ? { spaceId } : undefined,
  );

  const row = React.useMemo(() => {
    if (!transactionId || !transactions.transactions) return null;
    return transactions.transactions.find((t) => t.id === transactionId) ?? null;
  }, [transactionId, transactions.transactions]);

  // Fetch debts for this transaction's bill split
  const debts = useDebts(
    spaceId ? {} : null,
  );

  const splitDebts = React.useMemo(() => {
    if (!row?.billSplitId) return [];
    return (debts.debts ?? []).filter(
      (d) => d.debt.billSplitId === row.billSplitId,
    );
  }, [row?.billSplitId, debts.debts]);

  if (!open || !transactionId) return null;

  const meta = row ? TYPE_META[row.type] ?? TYPE_META.expense : TYPE_META.expense;
  const TypeIcon = meta.icon;
  const isSplit = row?.billSplitId != null;
  const isTransfer = row?.type === "transfer";
  const personalDiffers = row ? row.personalAmount !== row.amount : false;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className={cn("flex size-8 items-center justify-center rounded-full bg-muted", meta.color)}>
              <TypeIcon className="size-4" />
            </span>
            Transaction Details
          </DialogTitle>
        </DialogHeader>

        {transactions.isPending ? (
          <div className="space-y-3">
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
          </div>
        ) : !row ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            Transaction not found.
          </p>
        ) : (
          <div className="space-y-4">
            {/* Amount hero */}
            <div className="rounded-xl bg-muted/30 p-4 text-center">
              <p className={cn("text-3xl font-bold tabular-nums", meta.color)}>
                {row.type === "income" || row.type === "refund" ? "+" : "−"}
                {fmtMoney(row.amount, row.currency)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {meta.label} · {format(new Date(row.date), "EEEE, MMM d, yyyy")}
              </p>
              {personalDiffers ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  Your share: <span className="font-medium text-foreground">{fmtMoney(row.personalAmount, row.currency)}</span>
                </p>
              ) : null}
            </div>

            {/* Info rows */}
            <div className="space-y-3">
              <DetailRow label="Description" icon={FileTextIcon}>
                <p className="text-sm">
                  {row.description ?? <span className="text-muted-foreground italic">No description</span>}
                </p>
              </DetailRow>

              <DetailRow label="Status" icon={CheckIcon}>
                <Badge variant={row.status === "posted" ? "secondary" : "outline"}>
                  {row.status}
                </Badge>
              </DetailRow>

              <DetailRow label="Created" icon={ClockIcon}>
                <p className="text-sm">
                  {format(new Date(row.createdAt), "MMM d, yyyy 'at' h:mm a")}
                </p>
              </DetailRow>

              {row.notes ? (
                <DetailRow label="Notes" icon={HashIcon}>
                  <p className="text-sm text-muted-foreground">{row.notes}</p>
                </DetailRow>
              ) : null}

              {isTransfer ? (
                <>
                  <DetailRow label="From" icon={ArrowUpRightIcon}>
                    <p className="text-sm font-medium">Account {row.accountId?.slice(0, 8)}...</p>
                  </DetailRow>
                  <DetailRow label="To" icon={ArrowDownLeftIcon}>
                    <p className="text-sm font-medium">Account {row.destinationAccountId?.slice(0, 8)}...</p>
                  </DetailRow>
                </>
              ) : null}
            </div>

            {/* Split details */}
            {isSplit ? (
              <>
                <Separator />
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <UsersIcon className="size-4 text-muted-foreground" />
                    <p className="text-sm font-semibold">Split Details</p>
                    <Badge variant="secondary" className="text-[10px]">
                      {splitDebts.length + 1} participants
                    </Badge>
                  </div>

                  {/* Participants list */}
                  <div className="space-y-2">
                    {/* Creator / paid-by */}
                    <div className="flex items-center gap-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2.5">
                      <div className="flex size-7 items-center justify-center rounded-full bg-emerald-500/10 text-[10px] font-bold text-emerald-600">
                        P
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">Paid by you</p>
                        <p className="text-[10px] text-muted-foreground">Full amount paid</p>
                      </div>
                      <span className="text-sm font-semibold tabular-nums text-emerald-600">
                        {fmtMoney(row.amount, row.currency)}
                      </span>
                    </div>

                    {/* Other participants from debts */}
                    {splitDebts.map((debt) => {
                      const outstanding = Number(debt.outstandingAmount);
                      const isSettled = debt.status === "settled";
                      const isPartial = debt.status === "partially_settled";

                      return (
                        <div
                          key={debt.debt.id}
                          className={cn(
                            "flex items-center gap-3 rounded-lg border px-3 py-2.5",
                            isSettled
                              ? "border-border/40 opacity-60"
                              : isPartial
                                ? "border-amber-500/20 bg-amber-500/5"
                                : "border-border/40",
                          )}
                        >
                          <div
                            className={cn(
                              "flex size-7 items-center justify-center rounded-full text-[10px] font-bold",
                              isSettled
                                ? "bg-emerald-500/10 text-emerald-600"
                                : "bg-muted text-muted-foreground",
                            )}
                          >
                            {(debt.creditorName || debt.debtorName || "?").charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium">
                              {debt.creditorName || debt.debtorName || "Unknown"}
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              {isSettled
                                ? "Settled ✓"
                                : isPartial
                                  ? `Partially settled · ${fmtMoney(outstanding, debt.debt.currency)} remaining`
                                  : `Owes ${fmtMoney(Number(debt.debt.amount), debt.debt.currency)}`}
                            </p>
                          </div>
                          <Badge
                            variant={isSettled ? "secondary" : "outline"}
                            className={cn(
                              "text-[10px]",
                              isSettled && "text-emerald-600",
                              isPartial && "text-amber-600",
                            )}
                          >
                            {isSettled ? "Settled" : isPartial ? "Partial" : "Open"}
                          </Badge>
                        </div>
                      );
                    })}
                  </div>

                  {/* Summary */}
                  <div className="rounded-lg bg-muted/30 p-3">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Total amount</span>
                      <span className="font-medium text-foreground">{fmtMoney(row.amount, row.currency)}</span>
                    </div>
                    <div className="mt-1 flex justify-between text-xs text-muted-foreground">
                      <span>Your share</span>
                      <span className="font-medium text-foreground">{fmtMoney(row.personalAmount, row.currency)}</span>
                    </div>
                    <div className="mt-1 flex justify-between text-xs text-muted-foreground">
                      <span>Outstanding</span>
                      <span className="font-medium text-foreground">
                        {fmtMoney(
                          splitDebts.reduce((acc, d) => acc + Number(d.outstandingAmount), 0),
                          row.currency,
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              </>
            ) : null}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
