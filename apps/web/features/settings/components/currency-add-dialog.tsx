"use client";

import * as React from "react";
import { Loader2Icon, PlusIcon } from "lucide-react";

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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { useCreateCurrency } from "~/hooks/api/currency";

const MINOR_UNIT_OPTIONS = [0, 1, 2, 3, 4, 5, 6] as const;

function formatMinorUnits(minorUnits: number): string {
  return minorUnits === 0
    ? "no decimals"
    : `${minorUnits} decimal${minorUnits === 1 ? "" : "s"}`;
}

/**
 * Add-currency dialog (admin only) — mirrors the admin dashboard's form.
 * Registers global reference data so pickers can offer the new currency.
 */
export function AddCurrencyDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [code, setCode] = React.useState("");
  const [name, setName] = React.useState("");
  const [symbol, setSymbol] = React.useState("");
  const [minorUnits, setMinorUnits] = React.useState("2");

  const { createCurrency, isPending } = useCreateCurrency({
    onSuccess: (currency) => {
      toast.success(`Currency ${currency.code} created`);
      setCode("");
      setName("");
      setSymbol("");
      setMinorUnits("2");
      onOpenChange(false);
    },
    onError: (err) => toast.error(err.message || "Failed to create currency"),
  });

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    createCurrency({
      code: code.trim().toUpperCase(),
      name: name.trim(),
      symbol: symbol.trim(),
      minorUnits: Number(minorUnits),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add currency</DialogTitle>
          <DialogDescription>
            Register reference data for spaces and accounts.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="settings-currency-code">Code</Label>
              <Input
                id="settings-currency-code"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="e.g. INR"
                maxLength={10}
                required
                autoFocus
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="settings-currency-symbol">Symbol</Label>
              <Input
                id="settings-currency-symbol"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
                placeholder="e.g. ₹"
                maxLength={10}
                required
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="settings-currency-name">Name</Label>
            <Input
              id="settings-currency-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Indian Rupee"
              maxLength={100}
              required
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="settings-currency-minor-units">Decimal places</Label>
            <Select
              value={minorUnits}
              onValueChange={(v) => v && setMinorUnits(v)}
            >
              <SelectTrigger id="settings-currency-minor-units">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MINOR_UNIT_OPTIONS.map((units) => (
                  <SelectItem key={units} value={String(units)}>
                    {formatMinorUnits(units)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? (
                <Loader2Icon className="size-4 animate-spin" />
              ) : (
                <PlusIcon className="size-4" />
              )}
              Add currency
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}