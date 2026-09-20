"use client";

import * as React from "react";
import { format } from "date-fns";
import {
  ArrowDownLeftIcon,
  ArrowUpRightIcon,
  HandCoinsIcon,
  Loader2Icon,
  MoreHorizontal,
  PlusIcon,
  SearchIcon,
  XIcon,
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
import { useSpaces } from "~/hooks/api/space";
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

  const spaces = useSpaces({});
  const currency = spaces.spaces?.[0]?.space.baseCurrency ?? "USD";

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

                <div className="text-right">
                  <p className="text-sm font-semibold tabular-nums">
                    {fmtMoney(item.debt.amount)} {item.debt.currency}
                  </p>
                  {Number(item.debt.paidAmount) > 0 ? (
                    <p className="text-xs text-muted-foreground tabular-nums">
                      {fmtMoney(item.outstandingAmount)} outstanding
                    </p>
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
      <div className="grid gap-4 sm:grid-cols-2">
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
      </div>

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

      <CreateDebtDialog
        currency={currency}
        open={createOpen}
        onOpenChange={setCreateOpen}
      />
    </div>
  );
}
