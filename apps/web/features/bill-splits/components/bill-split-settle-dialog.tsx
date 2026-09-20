"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type {
  Category,
  SettleForm,
  SettleShare,
  SplitDetail,
} from "@/features/bill-splits/lib/types";

interface BillSplitSettleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settleShare: SettleShare | null;
  selectedSplit: SplitDetail | null;
  form: SettleForm;
  setForm: (form: SettleForm) => void;
  categories: Category[];
  fmt: (amount: number) => string;
  isPending: boolean;
  onSettle: () => void;
}

export function BillSplitSettleDialog({
  open,
  onOpenChange,
  settleShare,
  selectedSplit,
  form,
  setForm,
  categories,
  fmt,
  isPending,
  onSettle,
}: BillSplitSettleDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Settle with {settleShare?.userName}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="rounded-lg bg-muted/30 p-3">
            <p className="text-xs text-muted-foreground">
              {settleShare?.userName} owes {fmt(settleShare?.amount || 0)} for &quot;{selectedSplit?.title}&quot;
            </p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">
              Your category (expense — how you track this)
            </Label>
            <select
              value={form.fromCategoryId}
              onChange={(e) =>
                setForm({ ...form, fromCategoryId: e.target.value })
              }
              className="w-full h-9 rounded-lg border border-border bg-background px-2 text-sm"
            >
              <option value="">No category</option>
              {categories
                .filter((c) => c.type === "expense")
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">
              Their category (income — how they track this)
            </Label>
            <select
              value={form.toCategoryId}
              onChange={(e) =>
                setForm({ ...form, toCategoryId: e.target.value })
              }
              className="w-full h-9 rounded-lg border border-border bg-background px-2 text-sm"
            >
              <option value="">No category</option>
              {categories
                .filter((c) => c.type === "income")
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Note (optional)</Label>
            <Input
              placeholder="e.g. Venmo payment"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>

          <p className="text-[10px] text-muted-foreground">
            This will create transactions in both your and their transaction lists.
          </p>

          <div className="flex gap-2">
            <Button
              className="flex-1"
              onClick={onSettle}
              disabled={isPending}
            >
              {isPending ? "Settling..." : "Confirm Settlement"}
            </Button>
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
