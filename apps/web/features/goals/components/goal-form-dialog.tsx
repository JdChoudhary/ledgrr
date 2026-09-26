"use client";

import * as React from "react";
import { Loader2Icon } from "lucide-react";

import { toast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { useAccounts } from "~/hooks/api/account";
import {
  useCreateGoal,
  useUpdateGoal,
  type GoalRecord,
} from "~/hooks/api/goal";

interface GoalFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currency: string;
  /** Present = edit mode. */
  goal: GoalRecord | null;
}

/** Create / edit a goal. Saved amount is never editable — it's a cache. */
export function GoalFormDialog({
  open,
  onOpenChange,
  currency,
  goal,
}: GoalFormDialogProps) {
  const isEdit = !!goal;

  const [name, setName] = React.useState("");
  const [targetAmount, setTargetAmount] = React.useState("");
  const [targetDate, setTargetDate] = React.useState("");
  const [linkedAccountId, setLinkedAccountId] = React.useState("");

  const accounts = useAccounts(open ? {} : undefined);

  React.useEffect(() => {
    if (open) {
      setName(goal?.name ?? "");
      setTargetAmount(goal ? String(Number(goal.targetAmount)) : "");
      setTargetDate(goal?.targetDate ?? "");
      setLinkedAccountId(goal?.linkedAccountId ?? "");
    }
  }, [open, goal]);

  const { createGoal, isPending: creating } = useCreateGoal({
    onSuccess: () => {
      toast.success("Goal created");
      onOpenChange(false);
    },
    onError: (error) => toast.error(error.message),
  });

  const { updateGoal, isPending: updating } = useUpdateGoal({
    onSuccess: () => {
      toast.success("Goal updated");
      onOpenChange(false);
    },
    onError: (error) => toast.error(error.message),
  });

  const pending = creating || updating;

  const submit = () => {
    if (!name.trim()) {
      toast.error("Give your goal a name");
      return;
    }
    const parsed = Number(targetAmount);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      toast.error("Enter a target amount greater than zero");
      return;
    }

    if (isEdit && goal) {
      updateGoal({
        goalId: goal.id,
        name: name.trim(),
        targetAmount,
        targetDate: targetDate || null,
        linkedAccountId: linkedAccountId || null,
      });
    } else {
      createGoal({
        name: name.trim(),
        targetAmount,
        targetDate: targetDate || null,
        linkedAccountId: linkedAccountId || null,
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit goal" : "New goal"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update the goal's name, target, date, or linked account. Your deposits and withdrawals stay untouched."
              : "Set a target, then deposit whenever you save."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Field>
            <FieldLabel>Name</FieldLabel>
            <Input
              placeholder="e.g. Emergency fund"
              value={name}
              maxLength={120}
              onChange={(event) => setName(event.target.value)}
            />
          </Field>

          <Field>
            <FieldLabel>Target amount</FieldLabel>
            <InputGroup>
              <InputGroupAddon align="inline-start">
                <span className="text-muted-foreground pl-2 text-sm">
                  {currency}
                </span>
              </InputGroupAddon>
              <InputGroupInput
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={targetAmount}
                onChange={(event) => setTargetAmount(event.target.value)}
              />
            </InputGroup>
          </Field>

          <Field>
            <FieldLabel>Target date (optional)</FieldLabel>
            <Input
              type="date"
              value={targetDate}
              onChange={(event) => setTargetDate(event.target.value)}
            />
          </Field>

          <Field>
            <FieldLabel>Linked account (optional)</FieldLabel>
            <Select
              value={linkedAccountId || "none"}
              onValueChange={(value) => {
                if (value) setLinkedAccountId(value === "none" ? "" : value);
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="No linked account" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No linked account</SelectItem>
                {(accounts.accounts ?? []).map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={pending}>
            {pending ? <Loader2Icon className="size-4 animate-spin" /> : null}
            {isEdit ? "Save changes" : "Create goal"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
