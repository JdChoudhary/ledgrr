"use client";

import * as React from "react";
import { format } from "date-fns";
import {
  ArrowDownRight,
  ArrowUpRight,
  InfoIcon,
  Loader2Icon,
} from "lucide-react";

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
  InputGroupInput,
  InputGroupAddon,
} from "@/components/ui/input-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { useAccounts, type AccountRecord } from "~/hooks/api/account";
import {
  useContributeToGoal,
  type ContributionResult,
  type GoalRecord,
} from "~/hooks/api/goal";

const money = (value: number, currency: string): string =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(value);

export interface FundDialogState {
  goal: GoalRecord;
  mode: "deposit" | "withdrawal";
}

interface GoalFundDialogProps {
  state: FundDialogState | null;
  spaceId: string | undefined;
  spaceCurrency: string;
  onOpenChange: (open: boolean) => void;
  onContributed?: (result: ContributionResult) => void;
}

/**
 * Add / withdraw a deposit from a goal.
 *
 * Contributions are goal-domain records: no transactions rows are created
 * and the linked account's balance is untouched. On a withdrawal, if the
 * linked account's balance would drop below the goal's saved amount, an
 * explicit warning is shown and a notification is recorded.
 */
export function GoalFundDialog({
  state,
  spaceId,
  spaceCurrency,
  onOpenChange,
  onContributed,
}: GoalFundDialogProps) {
  const [amount, setAmount] = React.useState("");
  const [accountId, setAccountId] = React.useState<string>("");
  const [note, setNote] = React.useState("");

  const goal = state?.goal;

  // Mode starts from the button that opened the dialog, but can be switched
  // freely inside — deposit and withdrawal are both goal-only deposits.
  const [mode, setMode] = React.useState<"deposit" | "withdrawal">(
    state?.mode ?? "deposit",
  );

  React.useEffect(() => {
    if (state) {
      setMode(state.mode);
      setAmount("");
      setNote("");
      setAccountId(goal?.linkedAccountId ?? "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const accounts = useAccounts(spaceId ? { spaceId } : undefined);

  const { contribute, isPending: contributing } = useContributeToGoal({
    onSuccess: (result) => {
      if (result.type === "deposit") {
        toast.success(
          result.targetReached
            ? "Deposit recorded — goal fully funded! 🎉"
            : `Deposited ${money(Number(result.amount), spaceCurrency)}`,
        );
      } else {
        toast.success(
          `Withdrew ${money(Number(result.amount), spaceCurrency)}`,
        );
      }
      onContributed?.(result);
      onOpenChange(false);
    },
    onError: (error) => toast.error(error.message),
  });

  // The linked account (fallback: any account chosen in the dialog).
  const linkedAccount: AccountRecord | undefined = React.useMemo(() => {
    const list = accounts.accounts ?? [];
    const id = accountId || goal?.linkedAccountId || "";
    return list.find((account) => account.id === id);
  }, [accounts.accounts, accountId, goal?.linkedAccountId]);

  if (!goal) {
    return null;
  }

  const saved = Number(goal.currentAmount);
  const target = Number(goal.targetAmount);
  const parsedAmount = Number(amount);
  const validAmount = Number.isFinite(parsedAmount) && parsedAmount > 0;

  const accountBalance = linkedAccount ? Number(linkedAccount.balance) : null;
  const savedAfter = mode === "deposit" ? saved + (validAmount ? parsedAmount : 0) : saved - (validAmount ? parsedAmount : 0);
  const balanceAfter =
    accountBalance !== null && validAmount
      ? mode === "deposit"
        ? accountBalance
        : accountBalance - parsedAmount
      : accountBalance;

  // Warn: the withdrawal would leave the ACCOUNT below the goal's SAVED
  // amount — i.e. you're pulling out money you had set aside for this goal.
  const belowSavedWarning =
    mode === "withdrawal" &&
    validAmount &&
    savedAfter >= 0 &&
    balanceAfter !== null &&
    balanceAfter < savedAfter;

  const exceedsSaved =
    mode === "withdrawal" && validAmount && parsedAmount > saved;

  const submit = () => {
    if (!validAmount) {
      toast.error("Enter an amount greater than zero");
      return;
    }
    contribute({
      spaceId: goal.spaceId,
      goalId: goal.id,
      type: mode,
      amount,
      accountId: accountId || null,
      note: note.trim() ? note.trim() : null,
    });
  };

  return (
    <Dialog open={!!state} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {mode === "deposit" ? (
              <ArrowUpRight className="size-5 text-emerald-500" />
            ) : (
              <ArrowDownRight className="size-5 text-amber-500" />
            )}
            {mode === "deposit" ? "Deposit to" : "Withdraw from"} “{goal.name}”
          </DialogTitle>
          <DialogDescription>
            Saved {money(saved, spaceCurrency)} of {money(target, spaceCurrency)} ·
            deposits and withdrawals are tracked in this goal only — no
            transactions, no balance changes.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Deposit / Withdrawal toggle — switch freely before submitting */}
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant={mode === "deposit" ? "default" : "outline"}
              className={
                mode === "deposit"
                  ? "bg-emerald-600 hover:bg-emerald-700"
                  : "text-emerald-600"
              }
              onClick={() => setMode("deposit")}
            >
              <ArrowUpRight className="size-4" />
              Deposit
            </Button>
            <Button
              type="button"
              variant={mode === "withdrawal" ? "default" : "outline"}
              className={
                mode === "withdrawal"
                  ? "bg-amber-600 hover:bg-amber-700"
                  : "text-amber-600"
              }
              onClick={() => setMode("withdrawal")}
            >
              <ArrowDownRight className="size-4" />
              Withdraw
            </Button>
          </div>

          <Field>
            <FieldLabel>Amount</FieldLabel>
            <InputGroup>
              <InputGroupAddon align="inline-start">
                <span className="text-muted-foreground pl-2 text-sm">
                  {spaceCurrency}
                </span>
              </InputGroupAddon>
              <InputGroupInput
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && validAmount) submit();
                }}
              />
            </InputGroup>
          </Field>

          <Field>
            <FieldLabel>Account (optional)</FieldLabel>
            <Select
              value={accountId || "none"}
              onValueChange={(value) => {
                if (value) setAccountId(value === "none" ? "" : value);
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="No linked account" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No linked account</SelectItem>
                {(accounts.accounts ?? []).map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.name} · {money(Number(account.balance), account.currency)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field>
            <FieldLabel>Note (optional)</FieldLabel>
            <Input
              placeholder="e.g. saved from this week's budget"
              value={note}
              maxLength={500}
              onChange={(event) => setNote(event.target.value)}
            />
          </Field>

          {/* Preview of what this deposit/withdrawal does to saved / balance */}
          {validAmount ? (
            <div className="text-muted-foreground flex items-center justify-between rounded-md border bg-muted/40 px-3 py-2 text-xs">
              <span>
                Saved: {money(saved, spaceCurrency)} →{" "}
                <span className="font-medium text-foreground">
                  {money(Math.max(savedAfter, 0), spaceCurrency)}
                </span>
              </span>
              {balanceAfter !== null && (
                <span>
                  Account: {money(accountBalance ?? 0, spaceCurrency)} →{" "}
                  <span className="font-medium text-foreground">
                    {money(balanceAfter, spaceCurrency)}
                  </span>
                </span>
              )}
            </div>
          ) : null}

          {exceedsSaved ? (
            <p className="text-destructive flex items-center gap-2 text-xs font-medium">
              <InfoIcon className="size-4" />
              Withdrawal exceeds the saved amount ({money(saved, spaceCurrency)}).
            </p>
          ) : belowSavedWarning ? (
            <p className="flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
              <InfoIcon className="mt-0.5 size-4 shrink-0" />
              This withdrawal drops the account below your{" "}
              <strong>saved amount</strong> ({money(savedAfter, spaceCurrency)}).
              You&apos;ll be notified that it reduces the money you set aside.
            </p>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={submit}
            disabled={!validAmount || exceedsSaved || contributing}
          >
            {contributing ? (
              <Loader2Icon className="size-4 animate-spin" />
            ) : mode === "deposit" ? (
              <ArrowUpRight className="size-4" />
            ) : (
              <ArrowDownRight className="size-4" />
            )}
            {mode === "deposit" ? "Deposit" : "Withdraw"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
