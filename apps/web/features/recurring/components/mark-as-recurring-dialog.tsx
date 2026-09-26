"use client";

import * as React from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/toast";
import { useCreateRecurringRule } from "~/hooks/api/recurring";

interface Transaction {
  id: string;
  amount: string;
  description: string | null;
  merchant: string | null;
  categoryId: string | null;
  accountId: string | null;
  type: string;
  currency: string;
  date: string;
}

interface MarkAsRecurringDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: Transaction | null;
  spaceId: string;
  accounts: Array<{ id: string; name: string }>;
  categories: Array<{ id: string; name: string }>;
}

export function MarkAsRecurringDialog({
  open,
  onOpenChange,
  transaction,
  spaceId,
  accounts,
  categories,
}: MarkAsRecurringDialogProps) {
  const [frequency, setFrequency] = React.useState("monthly");
  const [interval, setInterval] = React.useState("1");
  const [amountMode, setAmountMode] = React.useState<"fixed" | "variable">("fixed");
  const [autoPost, setAutoPost] = React.useState(true);

  const createRule = useCreateRecurringRule({
    onSuccess: () => {
      toast.success("Recurring rule created from transaction");
      onOpenChange(false);
    },
    onError: (err) => toast.error(err.message),
  });

  React.useEffect(() => {
    if (open && transaction) {
      setFrequency("monthly");
      setInterval("1");
      setAmountMode("fixed");
      setAutoPost(true);
    }
  }, [open, transaction]);

  if (!transaction) return null;

  const type = transaction.type === "income" ? "income" : "expense";

  const handleSubmit = () => {
    const parsedInterval = Math.max(1, Math.floor(Number(interval) || 1));

    createRule.createRuleAsync({
      spaceId,
      type,
      amount: Number(transaction.amount),
      description: transaction.description || transaction.merchant || "Recurring",
      schedule: {
        frequency: frequency as "daily" | "weekly" | "monthly" | "yearly",
        interval: parsedInterval,
        dayOfWeek: null,
        dayOfMonth: new Date(transaction.date).getDate(),
      },
      accountId: transaction.accountId,
      categoryId: transaction.categoryId,
      startDate: transaction.date,
      autoPost: autoPost && amountMode === "fixed",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-xl">
        <DialogHeader>
          <DialogTitle className="font-serif">Mark as recurring</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="rounded-lg border border-line p-3 space-y-1">
            <p className="text-sm font-medium">
              {transaction.description || transaction.merchant || "Transaction"}
            </p>
            <p className="text-xs text-muted-foreground">
              {format(new Date(transaction.date), "MMM d, yyyy")} · {Number(transaction.amount).toFixed(2)} {transaction.currency}
            </p>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground">Frequency</Label>
            <Select value={frequency} onValueChange={(v) => v && setFrequency(v)}>
              <SelectTrigger className="rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="yearly">Yearly</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground">Every</Label>
            <Input
              type="number"
              value={interval}
              onChange={(e) => setInterval(e.target.value)}
              min="1"
              className="rounded-xl"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground">Amount mode</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={amountMode === "fixed" ? "default" : "outline"}
                size="sm"
                className="rounded-xl flex-1"
                onClick={() => setAmountMode("fixed")}
              >
                Fixed
              </Button>
              <Button
                type="button"
                variant={amountMode === "variable" ? "default" : "outline"}
                size="sm"
                className="rounded-xl flex-1"
                onClick={() => setAmountMode("variable")}
              >
                Variable
              </Button>
            </div>
          </div>

          {amountMode === "fixed" && (
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="autoPost"
                checked={autoPost}
                onChange={(e) => setAutoPost(e.target.checked)}
                className="rounded"
              />
              <Label htmlFor="autoPost" className="text-sm">
                Auto-post when due
              </Label>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)} className="rounded-xl">
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={createRule.isPending}
            className="rounded-xl"
          >
            {createRule.isPending ? "Creating..." : "Create rule"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
