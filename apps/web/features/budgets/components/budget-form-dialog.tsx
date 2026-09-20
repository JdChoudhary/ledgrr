"use client";

import * as React from "react";
import { Loader2Icon } from "lucide-react";

import { toast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { CategoryCombobox } from "@/components/category/category-combobox";

import { useCreateBudget, useUpdateBudget } from "~/hooks/api/budget";

const PERIOD_OPTIONS = [
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "yearly", label: "Yearly" },
] as const;

type PeriodType = (typeof PERIOD_OPTIONS)[number]["value"];

const AMOUNT_PATTERN = /^\d+(\.\d{1,4})?$/;

function today(): string {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

export type BudgetRecord = {
  id: string;
  spaceId: string;
  categoryId: string;
  periodType: string;
  startsOn: string;
  limitAmount: string;
  rollover: boolean;
  archivedAt: Date | string | null;
};

type Props = {
  spaceId: string;
  spaceCurrency: string;
  budget?: BudgetRecord;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export function BudgetFormDialog({
  spaceId,
  spaceCurrency,
  budget,
  trigger,
  open: controlledOpen,
  onOpenChange,
}: Props) {
  const editing = Boolean(budget);
  const [internalOpen, setInternalOpen] = React.useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = (next: boolean) => {
    setInternalOpen(next);
    onOpenChange?.(next);
  };

  const [categoryId, setCategoryId] = React.useState<string | null>("");
  const [amount, setAmount] = React.useState("");
  const [periodType, setPeriodType] = React.useState<PeriodType>("monthly");
  const [startsOn, setStartsOn] = React.useState(today);
  const [endsOn, setEndsOn] = React.useState("");
  const [rollover, setRollover] = React.useState(false);
  const [alertThreshold, setAlertThreshold] = React.useState("");
  const [errors, setErrors] = React.useState<{ category?: string; amount?: string }>({});

  React.useEffect(() => {
    if (!open) return;
    if (budget) {
      setCategoryId(budget.categoryId);
      setAmount(budget.limitAmount);
      setPeriodType(
        (PERIOD_OPTIONS.find((p) => p.value === budget.periodType)?.value ??
          "monthly") as PeriodType,
      );
      setStartsOn(budget.startsOn);
      setEndsOn("");
      setRollover(budget.rollover);
      setAlertThreshold("");
    } else {
      setCategoryId("");
      setAmount("");
      setPeriodType("monthly");
      setStartsOn(today());
      setEndsOn("");
      setRollover(false);
      setAlertThreshold("");
    }
    setErrors({});
  }, [open, budget]);

  const { createBudget, isPending: creating } = useCreateBudget({
    onSuccess: () => {
      toast.success("Budget created");
      setOpen(false);
    },
    onError: (error) => toast.error("Couldn't create budget", error.message),
  });

  const { updateBudget, isPending: updating } = useUpdateBudget({
    onSuccess: () => {
      toast.success("Budget updated");
      setOpen(false);
    },
    onError: (error) => toast.error("Couldn't update budget", error.message),
  });

  const pending = creating || updating;

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const next: typeof errors = {};
    if (!categoryId) next.category = "Choose a category.";
    if (!AMOUNT_PATTERN.test(amount.trim()) || Number(amount) <= 0) {
      next.amount = "Enter an amount greater than 0.";
    }
    setErrors(next);
    if (Object.keys(next).length > 0 || !categoryId) return;

    const threshold = alertThreshold.trim()
      ? Math.min(100, Math.max(1, Number(alertThreshold.trim())))
      : null;

    if (editing && budget) {
      updateBudget({
        spaceId,
        budgetId: budget.id,
        limitAmount: amount.trim(),
        rollover,
        alertThresholdPercent: threshold,
      });
      return;
    }

    createBudget({
      spaceId,
      categoryId,
      periodType,
      startsOn,
      limitAmount: amount.trim(),
      rollover,
      alertThresholdPercent: threshold,
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setErrors({});
      }}
    >
      {React.isValidElement(trigger) ? <DialogTrigger render={trigger} /> : null}

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit budget" : "Create budget"}</DialogTitle>
          <DialogDescription>
            Every budget belongs to exactly one category — the category is the budget's identity.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
          {/* The one reusable category selector — grouped + ungrouped. */}
          <CategoryCombobox
            spaceId={spaceId}
            type="expense"
            value={categoryId}
            onValueChange={(id) => {
              setCategoryId(id);
              if (errors.category) {
                setErrors((prev) => ({ ...prev, category: undefined }));
              }
            }}
            error={errors.category}
            disabled={editing}
          />

          <Field data-invalid={!!errors.amount}>
            <FieldLabel>Limit</FieldLabel>
            <InputGroup>
              <InputGroupAddon align="inline-start">{spaceCurrency}</InputGroupAddon>
              <InputGroupInput
                inputMode="decimal"
                placeholder="0.00"
                value={amount}
                aria-invalid={!!errors.amount}
                onChange={(event) => {
                  setAmount(event.target.value);
                  if (errors.amount) {
                    setErrors((prev) => ({ ...prev, amount: undefined }));
                  }
                }}
              />
            </InputGroup>
            <FieldError errors={errors.amount ? [{ message: errors.amount }] : []} />
          </Field>

          {!editing ? (
            <div className="grid grid-cols-2 gap-3">
              <Field>
                <FieldLabel>Period</FieldLabel>
                <Select
                  items={PERIOD_OPTIONS}
                  value={periodType}
                  onValueChange={(value) => {
                    if (value) setPeriodType(value as PeriodType);
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PERIOD_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field>
                <FieldLabel>Starts on</FieldLabel>
                <Input
                  type="date"
                  value={startsOn}
                  onChange={(event) => setStartsOn(event.target.value)}
                />
              </Field>
            </div>
          ) : null}

          <div className="grid grid-cols-2 gap-3">
            <Field>
              <FieldLabel>Rollover</FieldLabel>
              <Select
                items={[
                  { value: "off", label: "Off" },
                  { value: "on", label: "On" },
                ]}
                value={rollover ? "on" : "off"}
                onValueChange={(value) => {
                  if (value) setRollover(value === "on");
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="off">Off</SelectItem>
                  <SelectItem value="on">On</SelectItem>
                </SelectContent>
              </Select>
            </Field>

            <Field>
              <FieldLabel>Alert threshold</FieldLabel>
              <InputGroup>
                <InputGroupInput
                  inputMode="numeric"
                  placeholder="80"
                  value={alertThreshold}
                  onChange={(event) => setAlertThreshold(event.target.value.replace(/[^\d]/g, ""))}
                />
                <InputGroupAddon align="inline-end">%</InputGroupAddon>
              </InputGroup>
            </Field>
          </div>

          <DialogFooter>
            <DialogClose render={<Button variant="outline" type="button" />}>Cancel</DialogClose>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2Icon className="animate-spin" />}
              {editing ? "Save changes" : "Create budget"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
