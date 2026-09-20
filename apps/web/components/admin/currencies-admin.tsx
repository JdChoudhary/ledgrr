"use client";

import { useMemo, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
  Coins,
  Loader2,
  Plus,
  RefreshCw,
  Search,
} from "lucide-react";

import { cn } from "cn";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
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
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "@/components/ui/toast";

import {
  useCurrencies,
  useCreateCurrency,
  useDeactivateCurrency,
  useActivateCurrency,
} from "~/hooks/api/currency";

type Currency = {
  code: string;
  name: string;
  symbol: string;
  minorUnits: number;
  isActive: boolean;
};

const MINOR_UNIT_OPTIONS = [0, 1, 2, 3, 4, 5, 6] as const;

function formatMinorUnits(minorUnits: number): string {
  return minorUnits === 0 ? "no decimals" : `${minorUnits} decimal${minorUnits === 1 ? "" : "s"}`;
}

export function CurrenciesAdmin() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [createOpen, setCreateOpen] = useState(false);

  const queryInput = useMemo(
    () => ({
      includeInactive: statusFilter === "all" || statusFilter === "inactive",
    }),
    [statusFilter],
  );

  const {
    currencies,
    isPending,
    isPlaceholderData,
    error,
    refetch,
  } = useCurrencies(queryInput, {
    placeholderData: keepPreviousData,
  });

  const { deactivateCurrency, isPending: deactivatePending } = useDeactivateCurrency({
    onSuccess: (currency) => {
      toast.success(`Currency ${currency.code} deactivated`);
      void refetch();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to deactivate currency");
    },
  });

  const { activateCurrency, isPending: activatePending } = useActivateCurrency({
    onSuccess: (currency) => {
      toast.success(`Currency ${currency.code} activated`);
      void refetch();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to activate currency");
    },
  });

  const filtered = useMemo(() => {
    const rows = currencies ?? [];
    const term = search.trim().toLowerCase();

    return rows.filter((currency) => {
      if (statusFilter === "active" && !currency.isActive) return false;
      if (statusFilter === "inactive" && currency.isActive) return false;
      if (!term) return true;
      return (
        currency.code.toLowerCase().includes(term) ||
        currency.name.toLowerCase().includes(term) ||
        currency.symbol.toLowerCase().includes(term)
      );
    });
  }, [currencies, search, statusFilter]);

  if (error) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-destructive/10">
            <Coins className="h-5 w-5 text-destructive" />
          </div>
          <div>
            <p className="text-sm font-medium">Failed to load currencies</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {error.message || "You may not have admin permission."}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Try again
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tighter">Currencies</h1>
        <p className="text-sm text-muted-foreground">
          Reference data used by spaces, accounts and exchange rates.
        </p>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row">
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search currencies…"
              className="h-9 pl-8"
              aria-label="Search currencies"
            />
          </div>

          <Select
            items={[
              { value: "all", label: "All statuses" },
              { value: "active", label: "Active" },
              { value: "inactive", label: "Inactive" },
            ]}
            value={statusFilter}
            onValueChange={(v) => v && setStatusFilter(v as typeof statusFilter)}
          >
            <SelectTrigger className="h-9 w-[130px]" aria-label="Status filter">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>

          {(deactivatePending || activatePending) && (
            <Loader2 className="h-4 w-4 animate-spin self-center text-muted-foreground" />
          )}
        </div>

        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" />
          New currency
        </Button>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead>Code</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Symbol</TableHead>
              <TableHead>Decimals</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-12">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isPending ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={6}>
                    <Skeleton className="h-9 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-40 text-center">
                  <div className="flex flex-col items-center gap-1.5">
                    <Coins className="h-6 w-6 text-muted-foreground/50" />
                    <p className="text-sm font-medium">No currencies found</p>
                    <p className="text-xs text-muted-foreground">
                      Try a different search term or clear the filters.
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((currency) => (
                <TableRow
                  key={currency.code}
                  className={cn(isPlaceholderData && "opacity-60")}
                >
                  <TableCell>
                    <span className="font-mono text-sm font-semibold">
                      {currency.code}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm">{currency.name}</TableCell>
                  <TableCell className="text-sm">{currency.symbol}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatMinorUnits(currency.minorUnits)}
                  </TableCell>
                  <TableCell>
                    {currency.isActive ? (
                      <Badge
                        variant="outline"
                        className="border-emerald-500/20 bg-emerald-500/10 text-emerald-600"
                      >
                        Active
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground">
                        Inactive
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {currency.isActive ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground"
                        disabled={deactivatePending}
                        onClick={() => deactivateCurrency({ code: currency.code })}
                      >
                        Deactivate
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground"
                        disabled={activatePending}
                        onClick={() => activateCurrency({ code: currency.code })}
                      >
                        Activate
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <p className="text-xs text-muted-foreground">
        {filtered.length} of {currencies?.length ?? 0} currencies
      </p>

      <CreateCurrencyDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={() => {
          setCreateOpen(false);
          void refetch();
        }}
      />
    </div>
  );
}

function CreateCurrencyDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}) {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("");
  const [minorUnits, setMinorUnits] = useState<string>("2");

  const { createCurrency, isPending: creating } = useCreateCurrency({
    onSuccess: (currency) => {
      toast.success(`Currency ${currency.code} created`);
      setCode("");
      setName("");
      setSymbol("");
      setMinorUnits("2");
      onCreated();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to create currency");
    },
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
          <DialogTitle>New currency</DialogTitle>
          <DialogDescription>
            Register reference data for spaces and accounts.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="currency-code">Code</Label>
              <Input
                id="currency-code"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="e.g. INR"
                maxLength={10}
                required
                autoFocus
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="currency-symbol">Symbol</Label>
              <Input
                id="currency-symbol"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
                placeholder="e.g. ₹"
                maxLength={10}
                required
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="currency-name">Name</Label>
            <Input
              id="currency-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Indian Rupee"
              maxLength={100}
              required
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="currency-minor-units">Decimal places</Label>
            <Select
              items={MINOR_UNIT_OPTIONS.map((units) => ({
                value: String(units),
                label: formatMinorUnits(units),
              }))}
              value={minorUnits}
              onValueChange={(v) => v && setMinorUnits(v)}
            >
              <SelectTrigger id="currency-minor-units">
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
              disabled={creating}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={creating}>
              {creating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              Create currency
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
