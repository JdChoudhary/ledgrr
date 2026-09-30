"use client";

import * as React from "react";
import { format, parseISO } from "date-fns";
import { Check, SkipForward, ArrowUpRight, ArrowDownRight, ArrowUpDown, Calendar, Repeat, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/components/ui/toast";
import { cn } from "cn";
import { useConfirmOccurrence, useSkipOccurrence } from "~/hooks/api/recurring";
import type { OccurrenceListItem } from "../lib/types";

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  success: { label: "Confirmed", className: "bg-emerald-500/10 text-emerald-600" },
  awaiting_confirmation: { label: "Needs confirmation", className: "bg-amber-500/10 text-amber-600" },
  pending: { label: "Upcoming", className: "bg-slate-500/10 text-slate-600" },
  failed: { label: "Overdue", className: "bg-red-500/10 text-red-600" },
  skipped: { label: "Skipped", className: "bg-muted text-muted-foreground" },
};

const TYPE_CONFIG: Record<string, { icon: typeof ArrowUpRight; color: string; bg: string; bar: string; label: string }> = {
  income: { icon: ArrowUpRight, color: "text-emerald-600", bg: "bg-emerald-500/10", bar: "bg-emerald-500", label: "Income" },
  expense: { icon: ArrowDownRight, color: "text-red-600", bg: "bg-red-500/10", bar: "bg-red-500", label: "Expense" },
  transfer: { icon: ArrowUpDown, color: "text-blue-600", bg: "bg-blue-500/10", bar: "bg-blue-500", label: "Transfer" },
};

const FREQUENCY_LABELS: Record<string, string> = {
  daily: "day",
  weekly: "week",
  monthly: "month",
  yearly: "year",
};

interface OccurrenceDetailPanelProps {
  occurrence: OccurrenceListItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function OccurrenceDetailPanel({
  occurrence,
  open,
  onOpenChange,
}: OccurrenceDetailPanelProps) {
  const [confirmAmount, setConfirmAmount] = React.useState("");

  const confirmMutation = useConfirmOccurrence({
    onSuccess: () => {
      toast.success("Occurrence confirmed — transaction created");
      onOpenChange(false);
    },
    onError: (err) => toast.error(err.message),
  });

  const skipMutation = useSkipOccurrence({
    onSuccess: () => {
      toast.success("Occurrence skipped");
      onOpenChange(false);
    },
    onError: (err) => toast.error(err.message),
  });

  React.useEffect(() => {
    if (occurrence) {
      setConfirmAmount(Number(occurrence.ruleAmount).toFixed(2));
    }
  }, [occurrence]);

  if (!occurrence) return null;

  const status = STATUS_BADGE[occurrence.status] ?? STATUS_BADGE.pending;
  const typeConfig = TYPE_CONFIG[occurrence.ruleType] ?? TYPE_CONFIG.expense;
  const TypeIcon = typeConfig.icon;
  const canConfirm = occurrence.status === "awaiting_confirmation" || occurrence.status === "pending";

  const amount = Number(occurrence.ruleAmount);
  const prefix = occurrence.ruleType === "income" ? "+" : occurrence.ruleType === "transfer" ? "↔" : "−";
  const scheduledDate = parseISO(occurrence.scheduledFor);
  const freqEvery = occurrence.ruleInterval === 1 ? "" : `every ${occurrence.ruleInterval} `;
  const freqLabel = FREQUENCY_LABELS[occurrence.ruleFrequency] || occurrence.ruleFrequency;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px] p-0 gap-0 overflow-hidden">
        {/* Color bar header */}
        <div className={cn("h-1.5 w-full", typeConfig.bar)} />

        <div className="px-6 pt-5 pb-6 space-y-5">
          {/* Hero */}
          <div className="flex items-start gap-3">
            <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center shrink-0", typeConfig.bg)}>
              <TypeIcon className={cn("h-5 w-5", typeConfig.color)} />
            </div>
            <div className="flex-1 min-w-0">
              <DialogHeader className="text-left p-0">
                <DialogTitle className="text-base font-semibold leading-tight">
                  {occurrence.ruleDescription}
                </DialogTitle>
              </DialogHeader>
              <div className="flex items-center gap-2 mt-1.5">
                <Badge variant="secondary" className={cn("text-[10px]", status.className)}>
                  {status.label}
                </Badge>
                <Badge variant="outline" className="text-[10px] font-normal">
                  {typeConfig.label}
                </Badge>
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className={cn("text-lg font-bold tabular-nums", typeConfig.color)}>
                {prefix}{amount.toFixed(2)}
              </p>
              <p className="text-[10px] text-muted-foreground">{occurrence.ruleCurrency}</p>
            </div>
          </div>

          <Separator />

          {/* Details */}
          <div className="grid grid-cols-2 gap-4">
            <DetailCell icon={<Calendar className="h-3.5 w-3.5" />} label="Date" value={format(scheduledDate, "EEE, MMM d, yyyy")} />
            <DetailCell icon={<Repeat className="h-3.5 w-3.5" />} label="Schedule" value={`Every ${freqEvery}${freqLabel}${occurrence.ruleInterval === 1 ? "" : "s"}`} />
            <DetailCell
              icon={<DollarSign className="h-3.5 w-3.5" />}
              label="Amount"
              value={`${occurrence.ruleAmountMode === "variable" ? "~" : ""}${prefix}${amount.toFixed(2)}`}
              valueClassName={typeConfig.color}
            />
            <DetailCell
              icon={<TypeIcon className="h-3.5 w-3.5" />}
              label="Type"
              value={typeConfig.label}
              valueClassName={typeConfig.color}
            />
          </div>

          {/* Confirm / Skip */}
          {canConfirm && (
            <>
              <Separator />
              <div className="space-y-3">
                <div>
                  <h3 className="text-sm font-medium">Confirm this occurrence</h3>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Adjust the amount if needed, then confirm to post the transaction.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={confirmAmount}
                    onChange={(e) => setConfirmAmount(e.target.value)}
                    step="0.01"
                    min="0"
                    className="rounded-xl font-semibold tabular-nums h-9"
                    placeholder="Amount"
                  />
                  <span className="text-xs text-muted-foreground shrink-0">{occurrence.ruleCurrency}</span>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="flex-1 rounded-xl gap-1.5 h-9"
                    disabled={confirmMutation.isPending || !confirmAmount}
                    onClick={() => {
                      const val = Number(confirmAmount);
                      if (isNaN(val) || val <= 0) {
                        toast.error("Enter a valid amount");
                        return;
                      }
                      confirmMutation.confirmOccurrence({
                        occurrenceId: occurrence.id,
                        amount: val,
                      });
                    }}
                  >
                    <Check className="h-3.5 w-3.5" />
                    {confirmMutation.isPending ? "Confirming..." : "Confirm & post"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-xl gap-1.5 h-9"
                    disabled={skipMutation.isPending}
                    onClick={() => {
                      skipMutation.skipOccurrence({
                        occurrenceId: occurrence.id,
                        reason: "Skipped by user",
                      });
                    }}
                  >
                    <SkipForward className="h-3.5 w-3.5" />
                    Skip
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DetailCell({
  icon,
  label,
  value,
  valueClassName,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        {icon}
        <span className="text-[10px] font-medium uppercase tracking-wider">{label}</span>
      </div>
      <p className={cn("text-sm font-medium", valueClassName)}>{value}</p>
    </div>
  );
}
