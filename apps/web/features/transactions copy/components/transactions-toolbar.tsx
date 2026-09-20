"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  CalendarIcon,
  Plus,
  X,
} from "lucide-react";
import { format } from "date-fns";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  Account,
  CurrencySettings,
  GroupedCategories,
  TransactionFormData,
  TransactionType,
} from "@/features/transactions/lib/types";

interface TransactionsToolbarProps {
  count: number;
  isAddSheetOpen: boolean;
  onAddSheetOpenChange: (open: boolean) => void;
  formData: TransactionFormData;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>, isEdit?: boolean) => void;
  onCategoryChange: (value: string | null) => void;
  onAddTypeChange: (type: TransactionType) => void;
  onCancelCustomCategory: () => void;
  isCustomCategory: boolean;
  accounts: Account[];
  addFormGroupedCategories: GroupedCategories;
  currencySettings: CurrencySettings | null | undefined;
  addTransactionDate: Date | undefined;
  onAddDateSelect: (date: Date | undefined) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export function TransactionsToolbar({
  count,
  isAddSheetOpen,
  onAddSheetOpenChange,
  formData,
  onInputChange,
  onCategoryChange,
  onAddTypeChange,
  onCancelCustomCategory,
  isCustomCategory,
  accounts,
  addFormGroupedCategories,
  currencySettings,
  addTransactionDate,
  onAddDateSelect,
  onSubmit,
}: TransactionsToolbarProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
      <div>
        <p className="text-sm text-muted-foreground">
          {count} transaction
          {count !== 1 ? "s" : ""}
        </p>
      </div>
      <Sheet open={isAddSheetOpen} onOpenChange={onAddSheetOpenChange}>
        <SheetTrigger render={<Button size="sm" className="h-8 gap-1.5"><Plus className="h-3.5 w-3.5" />Add transaction</Button>} />
        <SheetContent side="right" className="w-full sm:max-w-md p-0">
          <div className="flex flex-col h-full">
            <SheetHeader className="px-5 py-4 border-b border-border/50">
              <SheetTitle className="text-base">New transaction</SheetTitle>
            </SheetHeader>
            <form
              onSubmit={onSubmit}
              className="flex-1 overflow-y-auto p-5 space-y-5"
            >
              {/* Type toggle */}
              <div className="flex gap-1 p-1 rounded-xl bg-muted/50">
                {(["expense", "income", "transfer"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => onAddTypeChange(t)}
                    className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${
                      formData.type === t
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </button>
                ))}
              </div>

              {/* Amount */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Amount
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                    {currencySettings?.currencySymbol || "$"}
                  </span>
                  <Input
                    type="number"
                    name="amount"
                    placeholder="0.00"
                    value={formData.amount}
                    onChange={onInputChange}
                    required
                    step="0.01"
                    min="0"
                    className="pl-7 h-11 text-lg font-semibold rounded-xl"
                  />
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Description
                </label>
                <Input
                  type="text"
                  name="description"
                  placeholder="What was this for?"
                  value={formData.description}
                  onChange={onInputChange}
                  required
                  className="h-11 rounded-xl"
                />
              </div>

              {/* Date */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Date
                </label>
                <Popover>
                  <PopoverTrigger render={<Button variant="outline" className={`w-full justify-start text-left font-normal h-11 rounded-xl ${!addTransactionDate && "text-muted-foreground"}`}><CalendarIcon className="mr-2 h-4 w-4" />{addTransactionDate ? format(addTransactionDate, "PPP") : "Pick a date"}</Button>} />
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={addTransactionDate}
                      onSelect={onAddDateSelect}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Category — hidden for transfer, optional for income */}
              {formData.type !== "transfer" && (
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    {formData.type === "income"
                      ? "Category (optional)"
                      : "Category"}
                  </label>
                  {!isCustomCategory ? (
                    <Select
                      onValueChange={onCategoryChange}
                      value={formData.category}
                    >
                      <SelectTrigger className="h-11 rounded-xl">
                        <SelectValue
                          placeholder={
                            formData.type === "income"
                              ? "e.g. Salary, Freelance"
                              : "Select a category"
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {addFormGroupedCategories.map((group) => (
                          <React.Fragment key={group.groupName ?? "ungrouped"}>
                            {group.groupName && (
                              <div className="px-2 py-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                                {group.groupName}
                              </div>
                            )}
                            {group.categories.map((cat) => (
                              <SelectItem key={cat.id} value={cat.name}>
                                <span className="flex items-center gap-2">
                                  <span
                                    className="h-2 w-2 rounded-full shrink-0"
                                    style={{ backgroundColor: cat.color || "#64748b" }}
                                  />
                                  {cat.name}
                                </span>
                              </SelectItem>
                            ))}
                          </React.Fragment>
                        ))}
                        <SelectItem value="custom">
                          + Add custom category
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="flex gap-2">
                      <Input
                        type="text"
                        name="category"
                        placeholder="Category name"
                        value={formData.category}
                        onChange={onInputChange}
                        className="h-11 rounded-xl"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-11 px-3"
                        onClick={onCancelCustomCategory}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* Account — required for expense/income */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  {formData.type === "transfer"
                    ? "From account"
                    : formData.type === "income"
                      ? "Deposit to"
                      : "Pay from"}
                  {formData.type !== "transfer" && (
                    <span className="text-red-500 ml-0.5">*</span>
                  )}
                </label>
                {accounts.length === 0 ? (
                  <p className="text-xs text-muted-foreground bg-muted/50 rounded-xl p-3">
                    No accounts yet.{" "}
                    <a
                      href="/app/accounts"
                      className="text-primary underline underline-offset-2"
                    >
                      Create one
                    </a>{" "}
                    to start tracking.
                  </p>
                ) : (
                  <Select
                    value={formData.accountId || ""}
                    onValueChange={(v) =>
                      onInputChange({
                        target: { name: "accountId", value: v ?? "" },
                      } as React.ChangeEvent<HTMLInputElement>)
                    }
                  >
                    <SelectTrigger className="h-11 rounded-xl">
                      <SelectValue placeholder="Select account" />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts.map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          <span className="flex items-center gap-2">
                            <span
                              className="h-2 w-2 rounded-full"
                              style={{ backgroundColor: account.color }}
                            />
                            {account.name}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {/* To account (transfer only, required) */}
              {formData.type === "transfer" && (
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    To account<span className="text-red-500 ml-0.5">*</span>
                  </label>
                  <Select
                    value={formData.toAccountId || ""}
                    onValueChange={(v) =>
                      onInputChange({
                        target: { name: "toAccountId", value: v ?? "" },
                      } as React.ChangeEvent<HTMLInputElement>)
                    }
                  >
                    <SelectTrigger className="h-11 rounded-xl">
                      <SelectValue placeholder="Select destination account" />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts
                        .filter((a) => a.id !== formData.accountId)
                        .map((account) => (
                          <SelectItem key={account.id} value={account.id}>
                            <span className="flex items-center gap-2">
                              <span
                                className="h-2 w-2 rounded-full"
                                style={{ backgroundColor: account.color }}
                              />
                              {account.name}
                            </span>
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Submit */}
              <Button type="submit" className="w-full h-11 rounded-xl">
                Add transaction
              </Button>
            </form>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
