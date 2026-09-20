"use client";

import React, { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/currency";
import { cn } from "@/lib/utils";
import { Search } from "lucide-react";
import type { Account, CurrencySettings } from "@/features/transactions/lib/types";

interface AccountPickerProps {
  accounts: Account[];
  selectedAccountId: string;
  onSelect: (accountId: string) => void;
  currencySettings: CurrencySettings | null | undefined;
  excludeAccountId?: string; // for transfer "to" picker
  label?: string;
}

export function AccountPicker({
  accounts,
  selectedAccountId,
  onSelect,
  currencySettings,
  excludeAccountId,
  label,
}: AccountPickerProps) {
  const [search, setSearch] = useState("");

  const fmt = (amount: number) => formatCurrency(amount, currencySettings);

  const filteredAccounts = useMemo(() => {
    let list = accounts;
    if (excludeAccountId) {
      list = list.filter((a) => a.id !== excludeAccountId);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (a) =>
          a.name.toLowerCase().includes(q) ||
          a.type.toLowerCase().includes(q)
      );
    }
    return list;
  }, [accounts, excludeAccountId, search]);

  const isLiability = (type: string) =>
    type === "credit" || type === "loan";

  const showChips = accounts.length <= 5 && !excludeAccountId && !search;

  if (accounts.length === 0) {
    return (
      <p className="text-xs text-muted-foreground bg-muted/50 rounded-xl p-3">
        No accounts yet.{" "}
        <a href="/dashboard/accounts" className="text-primary underline underline-offset-2">
          Create one
        </a>{" "}
        to start tracking.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {label && (
        <label className="text-xs font-medium text-muted-foreground">
          {label}
        </label>
      )}

      {/* Chip mode: ≤5 accounts */}
      {showChips ? (
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
          {filteredAccounts.map((account) => {
            const selected = account.id === selectedAccountId;
            const liability = isLiability(account.type);
            return (
              <button
                key={account.id}
                type="button"
                onClick={() => onSelect(account.id)}
                className={cn(
                  "flex flex-col items-center gap-1 min-w-[80px] px-3 py-2.5 rounded-xl border transition-all duration-200 shrink-0",
                  selected
                    ? "border-primary bg-primary/5 shadow-sm"
                    : "border-border/50 hover:border-border hover:bg-muted/30"
                )}
              >
                <div
                  className="h-3 w-3 rounded-full shrink-0"
                  style={{ backgroundColor: account.color }}
                />
                <span className="text-xs font-medium truncate max-w-[70px]">
                  {account.name}
                </span>
                <span
                  className={cn(
                    "text-[10px] tabular-nums font-semibold",
                    liability
                      ? "text-amber-600 dark:text-amber-400"
                      : "text-muted-foreground"
                  )}
                >
                  {liability && account.balance > 0 ? "−" : ""}
                  {fmt(Math.abs(account.balance))}
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        /* List mode: >5 accounts or searching */
        <div className="space-y-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search accounts..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 pl-8 text-sm rounded-lg"
            />
          </div>
          <div className="max-h-48 overflow-y-auto space-y-1">
            {filteredAccounts.map((account) => {
              const selected = account.id === selectedAccountId;
              const liability = isLiability(account.type);
              return (
                <button
                  key={account.id}
                  type="button"
                  onClick={() => {
                    onSelect(account.id);
                    setSearch("");
                  }}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors",
                    selected
                      ? "bg-primary/5 border border-primary/20"
                      : "hover:bg-muted/50 border border-transparent"
                  )}
                >
                  <div
                    className="h-3 w-3 rounded-full shrink-0"
                    style={{ backgroundColor: account.color }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{account.name}</p>
                    <p className="text-[10px] text-muted-foreground capitalize">{account.type}</p>
                  </div>
                  <span
                    className={cn(
                      "text-xs tabular-nums font-semibold shrink-0",
                      liability
                        ? "text-amber-600 dark:text-amber-400"
                        : "text-muted-foreground"
                    )}
                  >
                    {liability && account.balance > 0 ? "−" : ""}
                    {fmt(Math.abs(account.balance))}
                  </span>
                </button>
              );
            })}
            {filteredAccounts.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-4">
                No matching accounts
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
