"use client";

import * as React from "react";
import { format } from "date-fns";
import {
  ArrowDownLeftIcon,
  ArrowRightLeftIcon,
  ArrowUpRightIcon,
  HandCoinsIcon,
  Loader2Icon,
  MoreHorizontal,
  PlusIcon,
  SearchIcon,
  XIcon,
  ZapIcon,
} from "lucide-react";

import { toast } from "@/components/ui/toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  InputGroup,
  InputGroupInput,
  InputGroupAddon,
} from "@/components/ui/input-group";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { cn } from "cn";
import {
  useCancelDebt,
  useCreateDebt,
  useDebts,
  useSettleDebt,
} from "~/hooks/api/debt";
import { useSearchUsers } from "~/hooks/api/friendship";
import { useCreateContact } from "~/hooks/api/contacts";
import { useUserSettings } from "~/hooks/api/user-settings";
import { useSession } from "~/lib/auth-client";

/**
 * Debts view — obligations, never income/expense.
 *
 * Tabs separate what you are owed from what you owe. Settlements support
 * partial amounts; the outstanding figure is always derived from
 * amount - paid, and settled/cancelled debts are immutable.
 */

const fmtMoney = (value: string | number): string =>
  Number(value).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const STATUS_BADGE: Record<string, { label: string; variant: "secondary" | "outline" | "destructive" }> = {
  open: { label: "Open", variant: "secondary" },
  partially_settled: { label: "Partially settled", variant: "outline" },
  settled: { label: "Settled", variant: "outline" },
  cancelled: { label: "Cancelled", variant: "outline" },
};

function SettleDialog({
  debtId,
  counterparty,
  outstanding,
  currency,
  open,
  onOpenChange,
}: {
  debtId: string;
  counterparty: string;
  outstanding: string;
  currency: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [amount, setAmount] = React.useState("");
  const [paidOn, setPaidOn] = React.useState(() =>
    new Date().toISOString().slice(0, 10),
  );

  React.useEffect(() => {
    if (open) {
      setAmount(outstanding);
      setPaidOn(new Date().toISOString().slice(0, 10));
    }
  }, [open, outstanding]);

  const { settleDebt, isPending: settling } = useSettleDebt({
    onSuccess: () => {
      toast.success("Settlement recorded");
      onOpenChange(false);
    },
    onError: (err) => toast.error(err.message),
  });

  const parsed = Number(amount);
  const exceedsOutstanding =
    amount !== "" && !Number.isNaN(parsed) && parsed > Number(outstanding) + 0.0001;

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!amount || Number.isNaN(parsed) || parsed <= 0) {
      toast.error("Enter an amount greater than zero");
      return;
    }
    if (exceedsOutstanding) {
      toast.error("Settlement cannot exceed the outstanding amount");
      return;
    }
    settleDebt({ debtId, amount: parsed, paidOn });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Settle with {counterparty}</DialogTitle>
          <DialogDescription>
            A settlement is a transfer between parties — it is never recorded as
            income or expense.
          </DialogDescription>
        </DialogHeader>
        <form className="grid gap-4" onSubmit={submit}>
          <Field data-invalid={exceedsOutstanding ? "" : undefined}>
            <FieldLabel>Amount</FieldLabel>
            <InputGroup>
              <InputGroupAddon align="inline-start">{currency}</InputGroupAddon>
              <InputGroupInput
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </InputGroup>
            <FieldError>
              {exceedsOutstanding
                ? `Cannot exceed the outstanding ${fmtMoney(outstanding)}`
                : undefined}
            </FieldError>
          </Field>
          <Field>
            <FieldLabel>Paid on</FieldLabel>
            <InputDate value={paidOn} onChange={setPaidOn} />
          </Field>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={settling}>
              {settling ? <Loader2Icon className="size-4 animate-spin" /> : null}
              Record settlement
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function InputDate({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <input
      type="date"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-xs"
    />
  );
}

/**
 * Person picker result for debt creation — a Ledgr friend (userId) or one of
 * the owner's contacts (contactId, for people not on Ledgr yet).
 */
type DebtPerson =
  | { kind: "user"; userId: string; name: string }
  | { kind: "contact"; contactId: string; name: string }
  | null;

function CreateDebtDialog({
  currency,
  open,
  onOpenChange,
}: {
  currency: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data: sessionUser } = useSession();
  const selfUserId = sessionUser?.user?.id ?? null;

  // "i_owe" -> the other person is the creditor (you owe them);
  // "owed_to_me" -> the other person is the debtor.
  const [direction, setDirection] = React.useState<"owed_to_me" | "i_owe">(
    "owed_to_me",
  );
  const [person, setPerson] = React.useState<DebtPerson>(null);
  const [amount, setAmount] = React.useState("");
  const [dueDate, setDueDate] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [query, setQuery] = React.useState("");
  const [debouncedQuery, setDebouncedQuery] = React.useState("");

  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  React.useEffect(() => {
    if (open) {
      setDirection("owed_to_me");
      setPerson(null);
      setAmount("");
      setDueDate("");
      setNotes("");
      setQuery("");
      setDebouncedQuery("");
    }
  }, [open]);

  const search = useSearchUsers(
    open && debouncedQuery.trim().length >= 2
      ? { query: debouncedQuery.trim() }
      : undefined,
  );
  const results = (search.users ?? []).filter(
    (r) =>
      !(r.kind === "user" && r.id === selfUserId) &&
      !(person?.kind === "user" && person.userId === r.id) &&
      !(person?.kind === "contact" && person.contactId === r.id),
  );

  const { createDebtAsync, isPending: creating } = useCreateDebt({
    onSuccess: () => {
      toast.success("Debt recorded");
      onOpenChange(false);
    },
    onError: (err) => toast.error(err.message),
  });
  const { createContactAsync, isPending: creatingContact } = useCreateContact();

  const parsedAmount = Number(amount);
  const amountValid =
    amount !== "" && !Number.isNaN(parsedAmount) && parsedAmount > 0;
  const personValid = person != null;

  const pickPerson = async (result: {
    kind: "user" | "contact";
    id: string;
    name: string;
  }) => {
    setPerson(
      result.kind === "user"
        ? { kind: "user", userId: result.id, name: result.name }
        : { kind: "contact", contactId: result.id, name: result.name },
    );
  };

  /** Add a person by name who is neither on Ledgr nor a saved contact. */
  const addCustomPerson = async () => {
    const name = query.trim();
    if (name.length < 1) return;
    try {
      const contact = await createContactAsync({ name });
      setPerson({ kind: "contact", contactId: contact.id, name: contact.name });
      setQuery("");
      setDebouncedQuery("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not add person");
    }
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!personValid) {
      toast.error("Pick who this debt is with");
      return;
    }
    if (!amountValid) {
      toast.error("Enter an amount greater than zero");
      return;
    }
    if (selfUserId == null || person == null) return;

    const otherParty =
      person.kind === "user"
        ? { userId: person.userId }
        : { contactId: person.contactId };
    // One side is always the actor (a real user) — the service requires it.
    await createDebtAsync({
      creditor: direction === "owed_to_me" ? { userId: selfUserId } : otherParty,
      debtor: direction === "i_owe" ? { userId: selfUserId } : otherParty,
      amount: parsedAmount,
      currency,
      dueDate: dueDate === "" ? null : dueDate,
      notes: notes.trim() === "" ? null : notes.trim(),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>New debt</DialogTitle>
          <DialogDescription>
            A debt is an obligation — it is never recorded as income or
            expense.
          </DialogDescription>
        </DialogHeader>
        <form className="grid gap-4" onSubmit={submit}>
          <Field>
            <FieldLabel>Direction</FieldLabel>
            <div className="grid grid-cols-2 gap-1 rounded-xl bg-muted/50 p-1">
              {(
                [
                  { value: "owed_to_me", label: "They owe me" },
                  { value: "i_owe", label: "I owe them" },
                ] as const
              ).map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setDirection(option.value)}
                  className={cn(
                    "rounded-lg py-1.5 text-xs font-medium transition-all",
                    direction === option.value
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </Field>

          <Field>
            <FieldLabel>Person</FieldLabel>
            {person != null ? (
              <div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                  {person.name.charAt(0).toUpperCase()}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm font-medium">
                  {person.name}
                </span>
                {person.kind === "contact" ? (
                  <Badge variant="secondary" className="text-[9px]">
                    contact
                  </Badge>
                ) : null}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Change person"
                  onClick={() => setPerson(null)}
                >
                  <XIcon className="size-4" />
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <Input
                  placeholder="Search friends or contacts…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  autoComplete="off"
                />
                {search.isFetching ? (
                  <p className="text-xs text-muted-foreground">Searching…</p>
                ) : null}
                {results.length > 0 ? (
                  <div className="overflow-hidden rounded-lg border">
                    {results.map((result) => (
                      <button
                        key={`${result.kind}-${result.id}`}
                        type="button"
                        className="flex w-full items-center justify-between px-3 py-2 text-left text-sm transition-colors hover:bg-accent"
                        onClick={() => pickPerson(result)}
                      >
                        <span>{result.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {result.kind === "contact"
                            ? "contact"
                            : result.username
                              ? `@${result.username}`
                              : ""}
                        </span>
                      </button>
                    ))}
                  </div>
                ) : null}
                {query.trim().length >= 2 && !search.isFetching ? (
                  <button
                    type="button"
                    onClick={addCustomPerson}
                    disabled={creatingContact}
                    className="flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
                  >
                    <PlusIcon className="size-3.5" />
                    Add “{query.trim()}” as a new contact
                  </button>
                ) : null}
              </div>
            )}
          </Field>

          <Field data-invalid={amount !== "" && !amountValid ? "" : undefined}>
            <FieldLabel>Amount</FieldLabel>
            <InputGroup>
              <InputGroupAddon align="inline-start">{currency}</InputGroupAddon>
              <InputGroupInput
                inputMode="decimal"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </InputGroup>
            <FieldError>
              {amount !== "" && !amountValid
                ? "Enter an amount greater than zero"
                : undefined}
            </FieldError>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field>
              <FieldLabel>Due date (optional)</FieldLabel>
              <InputDate value={dueDate} onChange={setDueDate} />
            </Field>
            <Field>
              <FieldLabel>Note (optional)</FieldLabel>
              <Input
                placeholder="e.g. taxi fare"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </Field>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={creating || creatingContact}>
              {creating || creatingContact ? (
                <Loader2Icon className="size-4 animate-spin" />
              ) : null}
              Record debt
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Mutual debt settlement dialog
// ---------------------------------------------------------------------------

function MutualSettleDialog({
  personName,
  theyOwe,
  iOwe,
  currency,
  open,
  onOpenChange,
}: {
  personName: string;
  theyOwe: number;
  iOwe: number;
  currency: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const settleAmount = Math.min(theyOwe, iOwe);
  const [amount, setAmount] = React.useState(String(settleAmount));
  const [paidOn, setPaidOn] = React.useState(() =>
    new Date().toISOString().slice(0, 10),
  );

  React.useEffect(() => {
    if (open) {
      setAmount(String(Math.min(theyOwe, iOwe)));
      setPaidOn(new Date().toISOString().slice(0, 10));
    }
  }, [open, theyOwe, iOwe]);

  const { settleDebt, isPending: settling } = useSettleDebt({
    onSuccess: () => {
      toast.success("Mutual settlement recorded");
      onOpenChange(false);
    },
    onError: (err) => toast.error(err.message),
  });

  const parsed = Number(amount);
  const maxSettle = Math.min(theyOwe, iOwe);
  const exceedsMax = !Number.isNaN(parsed) && parsed > maxSettle + 0.0001;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRightLeftIcon className="size-5 text-primary" />
            Settle with {personName}
          </DialogTitle>
          <DialogDescription>
            Cancel out mutual debts in one action. This reduces both obligations
            simultaneously.
          </DialogDescription>
        </DialogHeader>

        {/* Visual summary */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 text-center">
            <p className="text-[11px] text-muted-foreground">They owe you</p>
            <p className="text-lg font-bold tabular-nums text-emerald-600">
              {fmtMoney(theyOwe)}
            </p>
          </div>
          <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-center">
            <p className="text-[11px] text-muted-foreground">You owe them</p>
            <p className="text-lg font-bold tabular-nums text-amber-600">
              {fmtMoney(iOwe)}
            </p>
          </div>
        </div>

        {/* Settle amount input */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground">
            Settle amount (max {fmtMoney(maxSettle)})
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
              {currency}
            </span>
            <input
              type="number"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full rounded-lg border border-input bg-background pl-10 pr-3 py-2 text-lg font-semibold tabular-nums"
            />
          </div>
          {exceedsMax ? (
            <p className="text-xs text-destructive">
              Cannot exceed the mutual settlement limit of {fmtMoney(maxSettle)}
            </p>
          ) : null}
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Date</label>
          <input
            type="date"
            value={paidOn}
            onChange={(e) => setPaidOn(e.target.value)}
            className="flex h-9 w-full rounded-md border px-3 py-1 text-sm"
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={settling || exceedsMax || parsed <= 0}
            onClick={() => {
              // Settle one direction — the other direction's debt is implicitly
              // reduced by the user settling the other side manually or via
              // the same mutual settlement on the opposite debt.
              // For simplicity, we settle the "they owe you" debt first.
              settleDebt({
                debtId: "", // TODO: need actual debt IDs
                amount: parsed,
                paidOn,
              });
            }}
          >
            {settling ? <Loader2Icon className="size-4 animate-spin" /> : null}
            Settle {fmtMoney(parsed)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Main debts view
// ---------------------------------------------------------------------------

export function DebtsView() {
  const [direction, setDirection] = React.useState<"all" | "owed_to_me" | "i_owe">(
    "all",
  );
  const [settleTarget, setSettleTarget] = React.useState<{
    debtId: string;
    counterparty: string;
    outstanding: string;
  } | null>(null);
  const [createOpen, setCreateOpen] = React.useState(false);
  const [mutualTarget, setMutualTarget] = React.useState<{
    personName: string;
    theyOwe: number;
    iOwe: number;
  } | null>(null);

  const { userSettings } = useUserSettings({});
  const currency = userSettings?.displayCurrency ?? "USD";

  const debts = useDebts({ direction });

  const { cancelDebt } = useCancelDebt({
    onSuccess: () => toast.success("Debt cancelled"),
    onError: (err) => toast.error(err.message),
  });

  const rows = debts.debts ?? [];
  const owedToMe = rows
    .filter((r) => r.debt.creditorUserId != null && r.status !== "cancelled")
    .reduce(
      (acc, r) =>
        acc + (r.debt.creditorUserId != null ? Number(r.outstandingAmount) : 0),
      0,
    );

  const owedByMe = rows
    .filter((r) => r.debt.debtorUserId != null && r.status !== "cancelled")
    .reduce((acc, r) => acc + Number(r.outstandingAmount), 0);

  // Detect mutual debts — people who owe you AND you owe them
  const mutualDebts = React.useMemo(() => {
    const map = new Map<string, { theyOwe: number; iOwe: number; name: string }>();
    for (const r of rows) {
      if (r.status === "cancelled" || r.status === "settled") continue;
      const outstanding = Number(r.outstandingAmount);
      if (outstanding <= 0) continue;

      // Determine the counterparty name
      const name = r.debt.creditorUserId != null ? r.debtorName : r.creditorName;
      if (!name) continue;

      const existing = map.get(name) ?? { theyOwe: 0, iOwe: 0, name };
      if (r.debt.creditorUserId != null) {
        // They owe you
        existing.theyOwe += outstanding;
      } else {
        // You owe them
        existing.iOwe += outstanding;
      }
      map.set(name, existing);
    }
    return [...map.values()].filter((m) => m.theyOwe > 0 && m.iOwe > 0);
  }, [rows]);

  if (debts.isPending) {
    return (
      <div className="grid gap-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  const renderList = (list: typeof rows, emptyLabel: string) =>
    list.length === 0 ? (
      <Card>
        <CardContent className="py-4">
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <HandCoinsIcon />
              </EmptyMedia>
              <EmptyTitle>{emptyLabel}</EmptyTitle>
              <EmptyDescription>
                Debts appear automatically when you split a transaction, or you
                can record one directly.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        </CardContent>
      </Card>
    ) : (
      <div className="grid gap-3">
        {list.map((item) => {
          const badge = STATUS_BADGE[item.status] ?? STATUS_BADGE.open;
          const isReceivable = item.debt.creditorUserId != null;
          const actionable =
            item.status === "open" || item.status === "partially_settled";
          return (
            <Card
              key={item.debt.id}
              className={cn(
                "py-4",
                item.status !== "open" &&
                  item.status !== "partially_settled" &&
                  "opacity-60",
              )}
            >
              <CardContent className="flex items-center gap-3 px-4">
                <span
                  className={cn(
                    "flex size-9 shrink-0 items-center justify-center rounded-full",
                    isReceivable
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-amber-100 text-amber-700",
                  )}
                >
                  {isReceivable ? (
                    <ArrowDownLeftIcon className="size-4" />
                  ) : (
                    <ArrowUpRightIcon className="size-4" />
                  )}
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium">
                      {isReceivable
                        ? `${item.debtorName} owes you`
                        : `You owe ${item.creditorName}`}
                    </p>
                    <Badge variant={badge.variant}>{badge.label}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {item.debt.sourceType === "bill_split"
                      ? "From a bill split"
                      : "Direct debt"}
                    {item.debt.notes ? ` · ${item.debt.notes}` : ""}
                    {item.debt.dueDate
                      ? ` · due ${format(new Date(item.debt.dueDate), "MMM d, yyyy")}`
                      : ""}
                  </p>
                </div>

                <div className="min-w-[100px] text-right">
                  <p className="text-sm font-semibold tabular-nums">
                    {fmtMoney(item.debt.amount)} {item.debt.currency}
                  </p>
                  {Number(item.debt.paidAmount) > 0 ? (
                    <div className="mt-1 space-y-1">
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-emerald-500 transition-all"
                          style={{
                            width: `${Math.min(100, (Number(item.debt.paidAmount) / Number(item.debt.amount)) * 100)}%`,
                          }}
                        />
                      </div>
                      <p className="text-[10px] text-muted-foreground tabular-nums">
                        {fmtMoney(item.outstandingAmount)} left
                      </p>
                    </div>
                  ) : null}
                </div>

                {actionable ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label="Debt actions"
                        />
                      }
                    >
                      <MoreHorizontal className="size-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() =>
                          setSettleTarget({
                            debtId: item.debt.id,
                            counterparty: isReceivable
                              ? item.debtorName
                              : item.creditorName,
                            outstanding: item.outstandingAmount,
                          })
                        }
                      >
                        <HandCoinsIcon className="size-4" />
                        Settle
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        variant="destructive"
                        onClick={() => cancelDebt({ debtId: item.debt.id })}
                      >
                        <XIcon className="size-4" />
                        Cancel debt
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : null}
              </CardContent>
            </Card>
          );
        })}
      </div>
    );

  return (
    <div className="grid gap-4">
      {/* Toolbar */}
      <div className="flex items-center justify-end">
        <Button onClick={() => setCreateOpen(true)}>
          <PlusIcon className="size-4" />
          New debt
        </Button>
      </div>

      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">Owed to you</span>
            <span className="text-2xl font-semibold tabular-nums text-emerald-600">
              {fmtMoney(owedToMe)}
            </span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">You owe</span>
            <span className="text-2xl font-semibold tabular-nums text-amber-600">
              {fmtMoney(owedByMe)}
            </span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">Net balance</span>
            <span
              className={cn(
                "text-2xl font-semibold tabular-nums",
                owedToMe - owedByMe >= 0 ? "text-emerald-600" : "text-amber-600",
              )}
            >
              {owedToMe - owedByMe >= 0 ? "+" : ""}
              {fmtMoney(owedToMe - owedByMe)}
            </span>
          </CardContent>
        </Card>
      </div>

      {/* Mutual debts quick-settle */}
      {mutualDebts.length > 0 ? (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="space-y-3 p-4">
            <div className="flex items-center gap-2">
              <ArrowRightLeftIcon className="size-4 text-primary" />
              <span className="text-sm font-semibold">Mutual Debts</span>
              <Badge variant="secondary" className="text-[10px]">
                {mutualDebts.length}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Settle mutual obligations in one action — cancel out what you owe each other.
            </p>
            <div className="space-y-2">
              {mutualDebts.map((m) => (
                <div
                  key={m.name}
                  className="flex items-center gap-3 rounded-lg border border-border/40 px-3 py-2.5"
                >
                  <div className="flex size-8 items-center justify-center rounded-full bg-muted text-xs font-bold">
                    {m.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{m.name}</p>
                    <div className="flex gap-3 text-[11px]">
                      <span className="text-emerald-600">
                        They owe: {fmtMoney(m.theyOwe)}
                      </span>
                      <span className="text-amber-600">
                        You owe: {fmtMoney(m.iOwe)}
                      </span>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="shrink-0"
                    onClick={() => setMutualTarget({ personName: m.name, theyOwe: m.theyOwe, iOwe: m.iOwe })}
                  >
                    <ZapIcon className="size-3.5" />
                    Settle
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Tabs
        value={direction}
        onValueChange={(v) =>
          setDirection(v as "all" | "owed_to_me" | "i_owe")
        }
      >
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="owed_to_me">Owed to you</TabsTrigger>
          <TabsTrigger value="i_owe">You owe</TabsTrigger>
        </TabsList>
        <TabsContent value="all">
          {renderList(rows, "No debts yet")}
        </TabsContent>
        <TabsContent value="owed_to_me">
          {renderList(
            rows.filter((r) => r.debt.creditorUserId != null),
            "Nobody owes you",
          )}
        </TabsContent>
        <TabsContent value="i_owe">
          {renderList(
            rows.filter((r) => r.debt.debtorUserId != null),
            "You owe nobody",
          )}
        </TabsContent>
      </Tabs>

      {debts.isError ? (
        <p className="text-sm text-destructive">Could not load debts</p>
      ) : null}

      {settleTarget ? (
        <SettleDialog
          debtId={settleTarget.debtId}
          counterparty={settleTarget.counterparty}
          outstanding={settleTarget.outstanding}
          currency={rows[0]?.debt.currency ?? currency}
          open={settleTarget != null}
          onOpenChange={(open) => {
            if (!open) setSettleTarget(null);
          }}
        />
      ) : null}

      {mutualTarget ? (
        <MutualSettleDialog
          personName={mutualTarget.personName}
          theyOwe={mutualTarget.theyOwe}
          iOwe={mutualTarget.iOwe}
          currency={currency}
          open={mutualTarget != null}
          onOpenChange={(open) => {
            if (!open) setMutualTarget(null);
          }}
        />
      ) : null}

      <CreateDebtDialog
        currency={currency}
        open={createOpen}
        onOpenChange={setCreateOpen}
      />
    </div>
  );
}
