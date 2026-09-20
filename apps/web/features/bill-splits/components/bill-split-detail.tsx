"use client";

import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ArrowLeft,
  Trash,
  CheckCircle,
  Clock,
  Check,
  DotsThree,
} from "@phosphor-icons/react";
import type { SplitDetail } from "@/features/bill-splits/lib/types";

interface BillSplitDetailProps {
  split: SplitDetail;
  fmt: (amount: number) => string;
  onBack: () => void;
  onDelete: (id: string) => void;
  onSettle: (share: {
    id: string;
    userId: string;
    amount: number;
    user: { name: string } | null;
  }) => void;
}

export function BillSplitDetail({
  split,
  fmt,
  onBack,
  onDelete,
  onSettle,
}: BillSplitDetailProps) {
  const paid = split.shares.filter((s) => s.isPaid).length;
  const total = split.shares.length;
  const pct = total > 0 ? (paid / total) * 100 : 0;
  const totalPaid = split.shares.filter((s) => s.isPaid).reduce((s, sh) => s + sh.amount, 0);
  const totalRemaining = split.totalAmount - totalPaid;

  return (
    <div className="space-y-4">
      {/* ── Back + Header ──────────────────────────────────────── */}
      <div>
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-[12px] text-muted-foreground hover:text-foreground transition-colors mb-3"
        >
          <ArrowLeft className="h-3.5 w-3.5" weight="regular" />
          Back to bill splits
        </button>

        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">{split.title}</h2>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-[12px] text-muted-foreground">
                {new Date(split.date).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
              <span className="text-[12px] text-muted-foreground">·</span>
              <span className="text-[12px] text-muted-foreground capitalize">
                {split.splitMethod} split
              </span>
            </div>
          </div>

          {/* Overflow menu */}
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" aria-label="More actions">
                  <DotsThree className="h-4 w-4" weight="regular" />
                </Button>
              }
            />
            <DropdownMenuContent align="end" className="w-36">
              <AlertDialog>
                <AlertDialogTrigger
                  render={
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onSelect={(e) => e.preventDefault()}
                    >
                      <Trash className="h-3.5 w-3.5 mr-2" weight="regular" />
                      Delete split
                    </DropdownMenuItem>
                  }
                />
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete split?</AlertDialogTitle>
                    <AlertDialogDescription>
                      &quot;{split.title}&quot; will be permanently deleted.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => onDelete(split.id)}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* ── Financial summary ─────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-px rounded-lg border border-border/50 overflow-hidden">
        <div className="bg-muted/10 px-4 py-3">
          <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">Total</p>
          <p className="text-[18px] font-semibold tabular-nums mt-1">{fmt(split.totalAmount)}</p>
        </div>
        <div className="bg-muted/10 px-4 py-3">
          <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">Paid</p>
          <p className="text-[18px] font-semibold tabular-nums text-emerald-600 dark:text-emerald-400 mt-1">
            {fmt(totalPaid)}
          </p>
        </div>
        <div className="bg-muted/10 px-4 py-3">
          <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">Remaining</p>
          <p className={`text-[18px] font-semibold tabular-nums mt-1 ${
            totalRemaining > 0 ? "text-amber-600 dark:text-amber-400" : ""
          }`}>
            {fmt(totalRemaining)}
          </p>
        </div>
      </div>

      {/* ── Progress ──────────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between text-[11px] mb-1">
          <span className="text-muted-foreground">
            {paid}/{total} paid
          </span>
          <span className="font-medium text-muted-foreground">{pct.toFixed(0)}%</span>
        </div>
        <div className="h-[3px] bg-muted rounded-full overflow-hidden">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* ── Creator ───────────────────────────────────────────── */}
      <p className="text-[11px] text-muted-foreground">
        Created by {split.creator?.name || "Unknown"}
      </p>

      {/* ── Shares ────────────────────────────────────────────── */}
      <div>
        <h3 className="text-[12px] font-medium text-muted-foreground mb-2">Shares</h3>
        <div className="rounded-lg border border-border/50 overflow-hidden">
          {split.shares.map((share) => {
            const initials = (share.user?.name || "You").split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
            return (
              <div
                key={share.id}
                className="flex items-center gap-3 px-4 py-3 border-b border-border/20 last:border-0"
              >
                {/* Avatar */}
                <div className="w-8 h-8 rounded-full bg-muted/30 flex items-center justify-center shrink-0">
                  {share.isPaid ? (
                    <CheckCircle className="h-4 w-4 text-emerald-500" weight="regular" />
                  ) : (
                    <span className="text-[10px] font-semibold text-muted-foreground">{initials}</span>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium truncate">
                    {share.user?.name || "You"}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {share.isPaid
                      ? `Paid${share.paidAt ? ` · ${new Date(share.paidAt).toLocaleDateString()}` : ""}`
                      : "Owes"}
                  </p>
                </div>

                {/* Amount + action */}
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[13px] font-semibold tabular-nums">{fmt(share.amount)}</span>
                  {!share.isPaid && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-[11px] gap-1 rounded-md"
                      onClick={() => onSettle(share)}
                    >
                      <Check className="h-3 w-3" weight="bold" />
                      Settle
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
