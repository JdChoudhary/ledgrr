"use client";

import React from "react";
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
  CalendarIcon,
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
  GroupedCategories,
  Tag,
  Transaction,
  TransactionType,
} from "@/features/transactions/lib/types";

interface TransactionFormDialogProps {
  isEditDialogOpen: boolean;
  onOpenChange: (open: boolean) => void;
  editData: Transaction | null;
  selectedDate: Date | undefined;
  onDateSelect: (date: Date | undefined) => void;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>, isEdit?: boolean) => void;
  editCategoryName: string;
  onEditCategoryNameChange: (value: string) => void;
  onEditCategoryValueChange: (value: string | null) => void;
  onCancelCustomCategory: () => void;
  editIsCustomCategory: boolean;
  onEditTypeChange: (type: TransactionType) => void;
  onAccountChange: (value: string | null) => void;
  onToAccountChange: (value: string | null) => void;
  editFormGroupedCategories: GroupedCategories;
  accounts: Account[];
  allTags: Tag[];
  onEditTagToggle: (tag: Tag) => void;
  onCancel: () => void;
  onSave: () => void;
}

export function TransactionFormDialog({
  isEditDialogOpen,
  onOpenChange,
  editData,
  selectedDate,
  onDateSelect,
  onInputChange,
  editCategoryName,
  onEditCategoryNameChange,
  onEditCategoryValueChange,
  onCancelCustomCategory,
  editIsCustomCategory,
  onEditTypeChange,
  onAccountChange,
  onToAccountChange,
  editFormGroupedCategories,
  accounts,
  allTags,
  onEditTagToggle,
  onCancel,
  onSave,
}: TransactionFormDialogProps) {
  return (
    <Dialog open={isEditDialogOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-106.25">
        <DialogHeader>
          <DialogTitle>Edit transaction</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          {/* Type toggle */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Type
            </label>
            <div className="flex gap-1 p-1 rounded-xl bg-muted/50">
              {(["expense", "income", "transfer"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => onEditTypeChange(t)}
                  className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${
                    editData?.type === t
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Amount
            </label>
            <Input
              type="number"
              name="amount"
              placeholder="0.00"
              value={editData?.amount || ""}
              onChange={(e) => onInputChange(e, true)}
              required
              step="0.01"
              min="0"
              className="rounded-xl"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Date
            </label>
            <Popover>
              <PopoverTrigger render={<Button variant="outline" className={`w-full justify-start text-left font-normal rounded-xl ${!selectedDate && "text-muted-foreground"}`}><CalendarIcon className="mr-2 h-4 w-4" />{selectedDate ? format(selectedDate, "PPP") : "Pick a date"}</Button>} />
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={onDateSelect}
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Description
            </label>
            <Input
              type="text"
              name="description"
              placeholder="Description"
              value={editData?.description || ""}
              onChange={(e) => onInputChange(e, true)}
              required
              className="rounded-xl"
            />
          </div>
          {/* Category — hidden for transfer, optional for income */}
          {editData?.type !== "transfer" && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                {editData?.type === "income"
                  ? "Category (optional)"
                  : "Category"}
              </label>
              {!editIsCustomCategory ? (
                <Select
                  value={editCategoryName}
                  onValueChange={onEditCategoryValueChange}
                >
                  <SelectTrigger className="rounded-xl">
                    <SelectValue
                      placeholder={
                        editData?.type === "income"
                          ? "e.g. Salary, Freelance"
                          : "Select a category"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {editFormGroupedCategories.map((group) => (
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
                    placeholder="Category name"
                    value={editCategoryName}
                    onChange={(e) => onEditCategoryNameChange(e.target.value)}
                    className="rounded-xl"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-auto px-3"
                    onClick={onCancelCustomCategory}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          )}
          {/* Account — required */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              {editData?.type === "transfer"
                ? "From account"
                : editData?.type === "income"
                  ? "Deposit to"
                  : "Pay from"}
              {editData?.type !== "transfer" && (
                <span className="text-red-500 ml-0.5">*</span>
              )}
            </label>
            <Select
              value={editData?.account?.id || ""}
              onValueChange={onAccountChange}
            >
              <SelectTrigger className="rounded-xl">
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
          </div>
          {/* To account (transfer only, required) */}
          {editData?.type === "transfer" && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                To account<span className="text-red-500 ml-0.5">*</span>
              </label>
              <Select
                value={editData?.toAccount?.id || ""}
                onValueChange={onToAccountChange}
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Select destination account" />
                </SelectTrigger>
                <SelectContent>
                  {accounts
                    .filter((a) => a.id !== editData?.account?.id)
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
          {/* Tags */}
          {allTags.length > 0 && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Tags
              </label>
              <div className="flex flex-wrap gap-1.5">
                {allTags.map((tag) => {
                  const isSelected = editData?.tags?.some((t) => t.id === tag.id) ?? false;
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => onEditTagToggle(tag)}
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium transition-all border ${
                        isSelected
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-muted/50 text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <span
                        className="h-1.5 w-1.5 rounded-full"
                        style={{ backgroundColor: tag.color }}
                      />
                      {tag.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button
            variant="secondary"
            onClick={onCancel}
            className="rounded-xl"
          >
            Cancel
          </Button>
          <Button onClick={onSave} className="rounded-xl">
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
