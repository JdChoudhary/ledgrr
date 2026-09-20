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
import { Plus, Check, X } from "lucide-react";
import type {
  Friend,
  CreateSplitForm,
  CurrencySettings,
} from "@/features/bill-splits/lib/types";

interface BillSplitCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: CreateSplitForm;
  setForm: (form: CreateSplitForm) => void;
  friends: Friend[];
  equalShares: { userId: string; amount: string }[];
  fmt: (amount: number) => string;
  currencySettings: CurrencySettings | null | undefined;
  onCreate: () => void;
}

export function BillSplitCreateDialog({
  open,
  onOpenChange,
  form,
  setForm,
  friends,
  equalShares,
  fmt,
  currencySettings,
  onCreate,
}: BillSplitCreateDialogProps) {
  const setField = (field: string, value: string) => {
    setForm({ ...form, [field]: value });
  };

  const toggleFriend = (id: string) => {
    setForm({
      ...form,
      selectedFriendIds: form.selectedFriendIds.includes(id)
        ? form.selectedFriendIds.filter((f) => f !== id)
        : [...form.selectedFriendIds, id],
      shares: [],
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New Bill Split</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Title</Label>
              <Input
                placeholder="e.g. Dinner at Mario's"
                value={form.title}
                onChange={(e) => setField("title", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Total Amount</Label>
              <Input
                type="number"
                placeholder="0.00"
                value={form.totalAmount}
                onChange={(e) => setField("totalAmount", e.target.value)}
                min="0"
                step="0.01"
              />
            </div>
          </div>

          {/* Split Method Toggle */}
          <div className="space-y-1.5">
            <Label className="text-xs">Split Method</Label>
            <div className="flex rounded-lg border p-0.5 bg-muted/30">
              <button
                className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-all ${
                  form.splitMethod === "equal"
                    ? "bg-background shadow-sm"
                    : "text-muted-foreground"
                }`}
                onClick={() => setForm({ ...form, splitMethod: "equal" })}
              >
                Equal Split
              </button>
              <button
                className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-all ${
                  form.splitMethod === "exact"
                    ? "bg-background shadow-sm"
                    : "text-muted-foreground"
                }`}
                onClick={() => setForm({ ...form, splitMethod: "exact" })}
              >
                Exact Amounts
              </button>
            </div>
          </div>

          {/* Friend Selection */}
          <div className="space-y-1.5">
            <Label className="text-xs">Split with</Label>
            {friends.length === 0 ? (
              <p className="text-xs text-muted-foreground py-2">
                Add friends first to split bills with them
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {friends.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => toggleFriend(f.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs border transition-all ${
                      form.selectedFriendIds.includes(f.id)
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:border-border"
                    }`}
                  >
                    {form.selectedFriendIds.includes(f.id) && (
                      <Check className="h-3 w-3" />
                    )}
                    {f.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Equal split preview */}
          {form.splitMethod === "equal" &&
            form.selectedFriendIds.length > 0 &&
            parseFloat(form.totalAmount) > 0 && (
              <div className="rounded-lg bg-muted/30 p-3 space-y-1">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                  Each person pays
                </p>
                <p className="text-lg font-bold">
                  {fmt(equalShares[0]?.amount ? parseFloat(equalShares[0].amount) : 0)}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  Split {fmt(parseFloat(form.totalAmount) || 0)} between{" "}
                  {form.selectedFriendIds.length + 1} people
                </p>
              </div>
            )}

          {/* Exact amounts input */}
          {form.splitMethod === "exact" && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Amounts per person</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs"
                  onClick={() =>
                    setForm({
                      ...form,
                      shares: [...form.shares, { userId: "", amount: "" }],
                    })
                  }
                >
                  + Add person
                </Button>
              </div>
              {form.shares.map((share, i) => (
                <div key={i} className="flex gap-2">
                  <select
                    value={share.userId}
                    onChange={(e) => {
                      const newShares = [...form.shares];
                      newShares[i] = { ...newShares[i], userId: e.target.value };
                      setForm({ ...form, shares: newShares });
                    }}
                    className="flex-1 h-9 rounded-lg border border-border bg-background px-2 text-xs"
                  >
                    <option value="">You</option>
                    {friends.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name}
                      </option>
                    ))}
                  </select>
                  <div className="relative w-28">
                    <Input
                      type="number"
                      placeholder="0.00"
                      value={share.amount}
                      onChange={(e) => {
                        const newShares = [...form.shares];
                        newShares[i] = { ...newShares[i], amount: e.target.value };
                        setForm({ ...form, shares: newShares });
                      }}
                      className="h-9 text-xs rounded-lg"
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-9 w-9 p-0"
                    onClick={() => {
                      const newShares = form.shares.filter((_, idx) => idx !== i);
                      setForm({ ...form, shares: newShares });
                    }}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <Button className="flex-1" onClick={onCreate}>
              Create Split
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
