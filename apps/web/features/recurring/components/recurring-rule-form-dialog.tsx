"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { RecurringAccount } from "../lib/types";

export interface RecurringFormData {
  description: string;
  amount: string;
  type: "income" | "expense" | "transfer";
  frequency: string;
  interval: string;
  accountId: string;
  toAccountId: string;
  categoryId: string;
}

interface RecurringCategory {
  id: string;
  name: string;
}

interface RecurringFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: RecurringFormData;
  onFormChange: (updater: (prev: RecurringFormData) => RecurringFormData) => void;
  startDate: Date | undefined;
  onStartDateChange: (date: Date | undefined) => void;
  accounts: RecurringAccount[];
  categories: RecurringCategory[];
  currency: string;
  onSubmit: () => void;
  onCancel: () => void;
}

export function RecurringFormDialog({
  open,
  onOpenChange,
  form,
  onFormChange,
  startDate,
  onStartDateChange,
  accounts,
  categories,
  currency,
  onSubmit,
  onCancel,
}: RecurringFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New recurring rule</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="flex gap-1 p-1 rounded-xl bg-muted/50">
            {(["expense", "income", "transfer"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() =>
                  onFormChange((p) => ({
                    ...p,
                    type: t,
                    accountId: "",
                    toAccountId: "",
                    categoryId: "",
                  }))
                }
                className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${
                  form.type === t
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Description</label>
            <Input
              placeholder="e.g. Netflix subscription"
              value={form.description}
              onChange={(e) => onFormChange((p) => ({ ...p, description: e.target.value }))}
              className="rounded-xl"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Amount <span className="font-normal">({currency})</span>
            </label>
            <Input
              type="number"
              placeholder="0.00"
              value={form.amount}
              onChange={(e) => onFormChange((p) => ({ ...p, amount: e.target.value }))}
              step="0.01"
              min="0"
              className="rounded-xl"
            />
          </div>

          {form.type !== "transfer" ? (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Category <span className="font-normal">(optional)</span>
              </label>
              <Select
                value={form.categoryId}
                onValueChange={(v) => v && onFormChange((p) => ({ ...p, categoryId: v }))}
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Frequency</label>
              <Select
                value={form.frequency}
                onValueChange={(v) => v && onFormChange((p) => ({ ...p, frequency: v }))}
              >
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
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Every</label>
              <Input
                type="number"
                value={form.interval}
                onChange={(e) => onFormChange((p) => ({ ...p, interval: e.target.value }))}
                min="1"
                className="rounded-xl"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Start date</label>
            <Popover>
              <PopoverTrigger
                render={
                  <Button
                    variant="outline"
                    className={`w-full justify-start text-left font-normal rounded-xl ${
                      !startDate && "text-muted-foreground"
                    }`}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, "PPP") : "Pick a date"}
                  </Button>
                }
              />
              <PopoverContent className="w-auto p-0">
                <Calendar mode="single" selected={startDate} onSelect={onStartDateChange} />
              </PopoverContent>
            </Popover>
          </div>

          {form.type !== "transfer" && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                {form.type === "income" ? "Deposit to" : "Pay from"}
              </label>
              <Select
                value={form.accountId}
                onValueChange={(v) => onFormChange((p) => ({ ...p, accountId: v ?? "" }))}
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Select account" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      <span className="flex items-center gap-2">
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: a.color }}
                        />
                        {a.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {form.type === "transfer" && (
            <>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">From account</label>
                <Select
                  value={form.accountId}
                  onValueChange={(v) => onFormChange((p) => ({ ...p, accountId: v ?? "" }))}
                >
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="Select source" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        <span className="flex items-center gap-2">
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: a.color }}
                          />
                          {a.name}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">To account</label>
                <Select
                  value={form.toAccountId}
                  onValueChange={(v) => onFormChange((p) => ({ ...p, toAccountId: v ?? "" }))}
                >
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="Select destination" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts
                      .filter((a) => a.id !== form.accountId)
                      .map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          <span className="flex items-center gap-2">
                            <span
                              className="h-2 w-2 rounded-full"
                              style={{ backgroundColor: a.color }}
                            />
                            {a.name}
                          </span>
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={onCancel} className="rounded-xl">
            Cancel
          </Button>
          <Button onClick={onSubmit} className="rounded-xl">
            Create rule
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
