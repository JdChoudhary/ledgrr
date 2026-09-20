"use client";

import * as React from "react";
import {
  ArrowDownLeftIcon,
  ArrowLeftRightIcon,
  ArrowLeftIcon,
  ArrowUpRightIcon,
  CalendarIcon,
  CheckIcon,
  ContactIcon,
  Loader2Icon,
  PencilIcon,
  RepeatIcon,
  UsersIcon,
  XIcon,
} from "lucide-react";
import { format } from "date-fns";

import { toast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FieldError } from "@/components/ui/field";

import { cn } from "cn";
import { useAccounts, type AccountRecord } from "~/hooks/api/account";
import { useCreateTransaction, useSplitPreview, useTransactions } from "~/hooks/api/transaction";
import { useCreateRecurringRule } from "~/hooks/api/recurring";
import { useSearchUsers } from "~/hooks/api/friendship";
import { useContacts } from "~/hooks/api/contacts";
import { useSession } from "~/lib/auth-client";
import { CategoryCombobox } from "@/components/category/category-combobox";

/**
 * Add-transaction dialog (modal) — modeled on the reference design
 * (`features/transactions copy` sheet + `features/recurring` form dialog):
 *
 * Step 1   — pick a type (expense / income / transfer), matching the
 *            recurring rule form's type selector.
 * Step 2   — the form: big amount input, description with autocomplete,
 *            category, account, date, notes.
 * Expense  — two inline collapsible sections, same toggle style:
 *            "Repeats" (frequency chips + every-N + ends → recurring rule)
 *            "Split with friends" (participants → bill split). Participants
 *            can be app-user friends, saved contacts (friends without a
 *            Ledgr account), or custom friends added by name (persisted to
 *            contacts and auto-linked on join).
 *
 * Repeats create a recurring rule; the saved transaction is the first
 * occurrence and later ones are auto-posted (or logged) by catch-up.
 * A split expense records the gross amount once and tracks each person's
 * share as debt — your share is the only part counted as your spending.
 */

type TxMode = "expense" | "income" | "transfer";
type Frequency = "daily" | "weekly" | "monthly" | "yearly";
type SplitMethod = "equal" | "exact" | "percentage" | "shares";

type Participant = {
  key: string;
  userId: string | null;
  contactId: string | null;
  name: string | null;
  shareValue: string;
};

const TYPE_CARDS: {
  value: TxMode;
  label: string;
  description: string;
  color: string;
  iconBg: string;
}[] = [
  {
    value: "expense",
    label: "Expense",
    description: "Money going out",
    color: "text-red-600 dark:text-red-400",
    iconBg: "bg-red-500/10",
  },
  {
    value: "income",
    label: "Income",
    description: "Money coming in",
    color: "text-emerald-600 dark:text-emerald-400",
    iconBg: "bg-emerald-500/10",
  },
  {
    value: "transfer",
    label: "Transfer",
    description: "Between your accounts",
    color: "text-blue-600 dark:text-blue-400",
    iconBg: "bg-blue-500/10",
  },
];

const MODE_ICON: Record<TxMode, React.ElementType> = {
  expense: ArrowUpRightIcon,
  income: ArrowDownLeftIcon,
  transfer: ArrowLeftRightIcon,
};

const WEEKDAY_OPTIONS = [
  { value: "1", label: "Mon" },
  { value: "2", label: "Tue" },
  { value: "3", label: "Wed" },
  { value: "4", label: "Thu" },
  { value: "5", label: "Fri" },
  { value: "6", label: "Sat" },
  { value: "0", label: "Sun" },
];

const FREQUENCY_NOUN: Record<Frequency, { one: string; many: string }> = {
  daily: { one: "day", many: "days" },
  weekly: { one: "week", many: "weeks" },
  monthly: { one: "month", many: "months" },
  yearly: { one: "year", many: "years" },
};

type Props = {
  spaceId: string;
  currency: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function TransactionFormDialog({ spaceId, currency, open, onOpenChange }: Props) {
  const { data: sessionUser } = useSession();
  const selfUserId = sessionUser?.user?.id ?? null;

  // --- dialog state -----------------------------------------------------------
  const [mode, setMode] = React.useState<TxMode | null>(null);

  // --- shared form state ------------------------------------------------------
  const [amount, setAmount] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [categoryId, setCategoryId] = React.useState<string | null>(null);
  const [accountId, setAccountId] = React.useState("");
  const [destinationAccountId, setDestinationAccountId] = React.useState("");
  const [date, setDate] = React.useState(() => new Date());
  const [notes, setNotes] = React.useState("");
  const [showNotes, setShowNotes] = React.useState(false);

  // --- repeat state -------------------------------------------------------------
  const [repeatEnabled, setRepeatEnabled] = React.useState(false);
  const [frequency, setFrequency] = React.useState<Frequency>("monthly");
  const [interval, setInterval] = React.useState("1");
  const [dayOfWeek, setDayOfWeek] = React.useState("1");
  const [dayOfMonth, setDayOfMonth] = React.useState("1");
  const [autoPost, setAutoPost] = React.useState(true);
  const [endMode, setEndMode] = React.useState<"never" | "date">("never");
  const [endDate, setEndDate] = React.useState<Date | null>(null);

  // --- split state (inline section inside the expense form) ---------------------
  const [splitEnabled, setSplitEnabled] = React.useState(false);
  const [participants, setParticipants] = React.useState<Participant[]>([]);
  const [method, setMethod] = React.useState<SplitMethod>("equal");
  const [friendQuery, setFriendQuery] = React.useState("");
  const [debouncedQuery, setDebouncedQuery] = React.useState("");

  const [errors, setErrors] = React.useState<Record<string, string | undefined>>({});

  const amountRef = React.useRef<HTMLInputElement>(null);
  const typeCardRefs = React.useRef<Partial<Record<TxMode, HTMLButtonElement | null>>>({});

  // --- data ---------------------------------------------------------------------
  const accounts = useAccounts(open ? { spaceId, includeArchived: false } : undefined);
  const accountOptions: AccountRecord[] = accounts.accounts ?? [];

  const { createTransactionAsync, isPending: creatingTransaction } = useCreateTransaction({
    onSuccess: () => toast.success("Transaction recorded"),
    onError: (err) => toast.error(err.message),
  });

  const { createRuleAsync, isPending: creatingRule } = useCreateRecurringRule({
    onSuccess: () => toast.success("Repeat scheduled"),
    onError: (err) => toast.error(err.message),
  });

  // Description autocomplete — drawn from already-loaded transactions.
  const recentTransactions = useTransactions(open ? { spaceId } : undefined);
  const descriptionSuggestions = React.useMemo(() => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const tx of recentTransactions.transactions ?? []) {
      const d = tx.description?.trim();
      if (d && !seen.has(d.toLowerCase())) {
        seen.add(d.toLowerCase());
        out.push(d);
        if (out.length >= 8) break;
      }
    }
    return out;
  }, [recentTransactions.transactions]);

  const filteredSuggestions = React.useMemo(() => {
    const q = description.trim().toLowerCase();
    if (!q) return [];
    return descriptionSuggestions
      .filter((d) => d.toLowerCase().includes(q) && d.toLowerCase() !== q)
      .slice(0, 5);
  }, [description, descriptionSuggestions]);

  // --- friends / contacts for the split picker ------------------------------------
  // searchUsers returns the combined people list (app users + your contacts),
  // deduped so a linked contact appears once.
  const friendSearch = useSearchUsers(
    open && mode === "expense" && splitEnabled && debouncedQuery.trim().length >= 2
      ? { query: debouncedQuery.trim() }
      : undefined,
  );
  const searchResults = friendSearch.users ?? [];

  const contacts = useContacts(open && mode === "expense" && splitEnabled ? undefined : null);
  const savedContacts = (contacts.contacts ?? []).filter((c) => c.linkedUserId == null);

  // --- reset on close ----------------------------------------------------------------
  React.useEffect(() => {
    if (!open) {
      // Delayed reset mirrors the reference: state clears after the close
      // animation so the dialog doesn't visibly blank out.
      const timer = setTimeout(() => {
        setMode(null);
        setAmount("");
        setDescription("");
        setCategoryId(null);
        setAccountId("");
        setDestinationAccountId("");
        setDate(new Date());
        setNotes("");
        setShowNotes(false);
        setRepeatEnabled(false);
        setFrequency("monthly");
        setInterval("1");
        setAutoPost(true);
        setEndMode("never");
        setEndDate(null);
        setSplitEnabled(false);
        setParticipants([]);
        setMethod("equal");
        setFriendQuery("");
        setDebouncedQuery("");
        setErrors({});
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [open]);

  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(friendQuery), 300);
    return () => clearTimeout(timer);
  }, [friendQuery]);

  // Auto-focus the amount input when a mode is chosen.
  React.useEffect(() => {
    if (open && mode) {
      const timer = setTimeout(() => amountRef.current?.focus(), 100);
      return () => clearTimeout(timer);
    }
  }, [open, mode]);

  const parsedAmount = Number(amount);
  const parsedInterval = Math.max(1, Math.floor(Number(interval) || 1));
  const parsedDayOfMonth = Math.min(31, Math.max(1, Math.floor(Number(dayOfMonth) || 1)));

  // --- split preview --------------------------------------------------------------------
  const previewParticipants = React.useMemo(
    () =>
      participants.map((p) => ({
        userId: p.userId,
        contactId: p.contactId,
        name: p.name,
        shareType: method,
        shareValue: method === "equal" ? null : p.shareValue === "" ? null : p.shareValue,
      })),
    [participants, method],
  );

  const preview = useSplitPreview(
    open && mode === "expense" && splitEnabled && participants.length >= 2 && parsedAmount > 0
      ? { amount: parsedAmount, participants: previewParticipants }
      : undefined,
  );
  const shares = preview.shares ?? [];
  const shareSum = shares.reduce((acc, s) => acc + Number(s.amount), 0);
  const sharesReconcile = shares.length > 0 && Math.abs(shareSum - parsedAmount) < 0.0001;

  const participantName = (p: Participant) => {
    if (p.userId != null && p.userId === selfUserId) return "You";
    return p.name ?? p.userId ?? "Participant";
  };

  // --- helpers ------------------------------------------------------------------------------
  const pickMode = (next: TxMode) => {
    setMode(next);
    setErrors({});
    setSplitEnabled(false);
    setParticipants([]);
    // Repeat settings don't carry across type switches (and transfer has no
    // repeat section at all — a stale flag would silently create a rule).
    setRepeatEnabled(false);
    setEndMode("never");
    setEndDate(null);
  };

  const moveTypeFocus = (dir: 1 | -1, current: TxMode) => {
    const i = TYPE_CARDS.findIndex((t) => t.value === current);
    const next = TYPE_CARDS[(i + dir + TYPE_CARDS.length) % TYPE_CARDS.length];
    typeCardRefs.current[next.value]?.focus();
  };

  const toggleRepeat = () => {
    const next = !repeatEnabled;
    setRepeatEnabled(next);
    if (next) {
      if (frequency === "monthly") setDayOfMonth(String(date.getDate()));
      if (frequency === "weekly") setDayOfWeek(String(date.getDay()));
    }
    if (next && accountId === "") setAutoPost(false);
    // Repeat + split are allowed together: a recurring split posts an
    // identical bill split (same participants) on every occurrence.
  };

  const toggleSplit = () => {
    const next = !splitEnabled;
    setSplitEnabled(next);
    if (next) {
      addSelf();
      // A recurring split MUST auto-post — reminders can't create the
      // participants' debts.
      if (repeatEnabled && participants.length >= 2) setAutoPost(true);
    }
  };

  const addSelf = () => {
    if (selfUserId == null || participants.some((p) => p.userId === selfUserId)) {
      return;
    }
    setParticipants((prev) => [
      { key: "self", userId: selfUserId, contactId: null, name: null, shareValue: "" },
      ...prev,
    ]);
  };

  const addSearchResult = (userId: string, name: string) => {
    if (participants.some((p) => p.userId === userId)) return;
    setParticipants((prev) => [
      ...prev,
      { key: `u-${userId}`, userId, contactId: null, name, shareValue: "" },
    ]);
  };

  const addContactParticipant = (contactId: string, name: string) => {
    if (participants.some((p) => p.contactId === contactId)) return;
    setParticipants((prev) => [
      ...prev,
      { key: `c-${contactId}`, userId: null, contactId, name, shareValue: "" },
    ]);
  };

  const removeParticipant = (key: string) =>
    setParticipants((prev) => prev.filter((p) => p.key !== key));

  // --- validation + submit -----------------------------------------------------------------
  const validate = (): boolean => {
    const next: Record<string, string | undefined> = {};
    if (!amount || Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      next.amount = "Enter an amount greater than zero";
    }
    if (mode === "transfer") {
      if (accountId === "") next.accountId = "A transfer needs a source account";
      if (destinationAccountId === "") {
        next.destinationAccountId = "A transfer needs a destination account";
      } else if (destinationAccountId === accountId) {
        next.destinationAccountId = "Destination must differ from the source";
      }
    }
    if (repeatEnabled && autoPost && accountId === "") {
      next.repeat = "Auto-post needs an account — pick one or turn auto-post off";
    }
    if (repeatEnabled && splitEnabled && participants.length >= 2) {
      if (mode !== "expense") {
        next.split = "Only expenses can be split";
      }
      if (!autoPost) {
        next.repeat =
          "A recurring split needs auto-post on — reminders can't create the participants' debts";
      }
    }
    if (mode === "expense" && splitEnabled) {
      if (participants.length < 2) {
        next.split = "Add at least one more person to split with";
      }
      if (participants.length >= 2 && method === "exact") {
        const sum = participants.reduce((acc, p) => acc + (Number(p.shareValue) || 0), 0);
        if (Math.abs(sum - parsedAmount) > 0.0001) {
          next.split = "Exact shares must add up to the transaction amount";
        }
      }
      if (participants.length >= 2 && method === "percentage") {
        const sum = participants.reduce((acc, p) => acc + (Number(p.shareValue) || 0), 0);
        if (Math.abs(sum - 100) > 0.0001) {
          next.split = "Percentages must add up to 100";
        }
      }
      if (preview.isError && preview.error instanceof Error) {
        next.split = preview.error.message;
      }
    }
    setErrors(next);
    return Object.values(next).every((v) => v == null);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (mode == null) return;
    if (!validate()) return;

    const isSplit = mode === "expense" && splitEnabled && participants.length >= 2;
    const billSplit = isSplit
      ? {
          title: description.trim() === "" ? "Split expense" : description.trim(),
          participants: participants.map((p) => ({
            userId: p.userId,
            contactId: p.contactId,
            name: p.name,
            shareType: method,
            shareValue: method === "equal" ? null : p.shareValue === "" ? null : p.shareValue,
          })),
        }
      : null;

    // 1. Record the first occurrence (this transaction).
    try {
      await createTransactionAsync({
        spaceId,
        type: mode,
        amount: parsedAmount,
        date: format(date, "yyyy-MM-dd"),
        accountId: accountId === "" ? null : accountId,
        destinationAccountId:
          mode === "transfer" && destinationAccountId !== "" ? destinationAccountId : null,
        categoryId,
        description: description.trim() === "" ? null : description.trim(),
        billSplit,
      });
    } catch {
      return; // Error already toasted by the hook.
    }

    // 2. Schedule the series.
    if (repeatEnabled) {
      try {
        await createRuleAsync({
          spaceId,
          type: mode,
          amount: parsedAmount,
          description: description.trim() === "" ? "Recurring transaction" : description.trim(),
          schedule: {
            frequency,
            interval: parsedInterval,
            dayOfWeek: frequency === "weekly" ? Number(dayOfWeek) : null,
            dayOfMonth: frequency === "monthly" ? parsedDayOfMonth : null,
          },
          accountId: accountId === "" ? null : accountId,
          destinationAccountId:
            mode === "transfer" && destinationAccountId !== "" ? destinationAccountId : null,
          categoryId,
          startDate: format(date, "yyyy-MM-dd"),
          endDate: endMode === "date" && endDate ? format(endDate, "yyyy-MM-dd") : null,
          autoPost,
          splitConfig: isSplit
            ? {
                title: description.trim() === "" ? "Split expense" : description.trim(),
                participants: participants.map((p) => ({
                  userId: p.userId,
                  contactId: p.contactId,
                  name: p.name,
                  shareType: method,
                  shareValue: method === "equal" ? null : p.shareValue === "" ? null : p.shareValue,
                })),
              }
            : null,
        });
      } catch {
        // Transaction saved; the repeat failed (error toasted by the hook).
      }
    }

    onOpenChange(false);
  };

  // --- derived split values -------------------------------------------------------------------
  const activeCount = participants.length;
  const perPersonEqual = activeCount > 0 && parsedAmount > 0 ? parsedAmount / activeCount : 0;

  // =========================================================================================
  // Render: step 1 — type picker (expense / income / transfer, like recurring)
  // =========================================================================================
  const renderTypePicker = () => (
    <div className="px-5 py-6">
      <p className="mb-4 text-center text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
        Choose a transaction type
      </p>
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3" role="group" aria-label="Transaction type">
        {TYPE_CARDS.map((t) => {
          const Icon = MODE_ICON[t.value];
          return (
            <button
              key={t.value}
              ref={(el) => {
                typeCardRefs.current[t.value] = el;
              }}
              type="button"
              onClick={() => pickMode(t.value)}
              onKeyDown={(e) => {
                if (e.key === "ArrowRight" || e.key === "ArrowDown") {
                  e.preventDefault();
                  moveTypeFocus(1, t.value);
                } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
                  e.preventDefault();
                  moveTypeFocus(-1, t.value);
                }
              }}
              className={cn(
                "flex items-center gap-3 rounded-xl border bg-card/40 p-3 text-left outline-none transition-all duration-150",
                "sm:w-full sm:flex-col sm:items-center sm:gap-2 sm:py-4 sm:text-center",
                "border-border/60 hover:border-foreground/20 hover:bg-muted/40",
                "focus-visible:border-ring/60 focus-visible:ring-2 focus-visible:ring-ring/30 active:scale-[0.98]",
              )}
            >
              <div
                className={cn(
                  "flex size-9 shrink-0 items-center justify-center rounded-full transition-colors duration-150",
                  t.iconBg,
                )}
              >
                <Icon className={cn("size-4", t.color)} />
              </div>
              <div className="min-w-0 sm:w-full">
                <p className="text-sm font-semibold leading-none">{t.label}</p>
                <p className="mt-1 text-[11px] leading-tight text-muted-foreground">
                  {t.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );

  // =========================================================================================
  // Render: shared sections
  // =========================================================================================
  const bigAmountInput = (value: string, onChange: (v: string) => void) => (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-lg font-medium text-muted-foreground">
        {currency}
      </span>
      <input
        ref={amountRef}
        type="number"
        inputMode="decimal"
        step="0.01"
        min="0"
        placeholder="0.00"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border-0 border-b-2 border-border/40 bg-transparent pl-12 pr-4 text-2xl font-bold tabular-nums outline-none transition-colors placeholder:text-muted-foreground/40 focus:border-primary"
      />
      <FieldError>{errors.amount}</FieldError>
    </div>
  );

  const descriptionInput = (
    <div className="relative">
      <Input
        placeholder="What was this for?"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />
      {filteredSuggestions.length > 0 ? (
        <div className="absolute inset-x-0 top-full z-50 mt-1 overflow-hidden rounded-lg border border-border/50 bg-background shadow-lg">
          {filteredSuggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setDescription(s)}
              className="w-full px-3 py-2 text-left text-xs transition-colors hover:bg-muted/50"
            >
              {s}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );

  const categoryPickerSection =
    mode !== "transfer" ? (
      <CategoryCombobox
        spaceId={spaceId}
        value={categoryId}
        onValueChange={setCategoryId}
        type={mode === "income" ? "income" : "expense"}
        label="Category"
        placeholder="Select category (optional)"
        className="min-w-0 flex-1"
      />
    ) : null;

  const accountSection = (
    <>
      <div className="space-y-2">
        <label className="text-xs font-medium text-muted-foreground">
          {mode === "transfer" ? "From account" : mode === "income" ? "Deposit to" : "Pay from"}{" "}
          <span className="font-normal">(optional)</span>
        </label>
        <div className="flex flex-wrap gap-1.5">
          {accountOptions.length === 0 ? (
            <p className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
              No accounts yet — you can still record the transaction without one.
            </p>
          ) : (
            accountOptions.map((account) => {
              const selected = account.id === accountId;
              return (
                <button
                  key={account.id}
                  type="button"
                  onClick={() => {
                    const next = selected ? "" : account.id;
                    setAccountId(next);
                    if (next === destinationAccountId) setDestinationAccountId("");
                  }}
                  className={cn(
                    "flex min-w-[80px] flex-col items-start gap-0.5 rounded-xl border px-3 py-2 transition-all duration-150",
                    selected
                      ? "border-primary bg-primary/5 shadow-sm"
                      : "border-border/50 hover:border-border hover:bg-muted/30",
                  )}
                >
                  <span className="flex items-center gap-1.5 text-xs font-medium">
                    <span
                      className="size-2 shrink-0 rounded-full"
                      style={{ backgroundColor: account.color ?? undefined }}
                    />
                    {account.name}
                  </span>
                  {account.balance != null ? (
                    <span className="text-[10px] tabular-nums text-muted-foreground">
                      {Number(account.balance).toLocaleString(undefined, {
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  ) : null}
                </button>
              );
            })
          )}
        </div>
        <FieldError>{errors.accountId}</FieldError>
      </div>

      {mode === "transfer" ? (
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground">To account</label>
          <div className="flex flex-wrap gap-1.5">
            {accountOptions
              .filter((a) => a.id !== accountId)
              .map((account) => (
                <button
                  key={account.id}
                  type="button"
                  onClick={() => setDestinationAccountId(account.id)}
                  className={cn(
                    "flex min-w-[80px] flex-col items-start gap-0.5 rounded-xl border px-3 py-2 transition-all duration-150",
                    destinationAccountId === account.id
                      ? "border-primary bg-primary/5 shadow-sm"
                      : "border-border/50 hover:border-border hover:bg-muted/30",
                  )}
                >
                  <span className="flex items-center gap-1.5 text-xs font-medium">
                    <span
                      className="size-2 shrink-0 rounded-full"
                      style={{ backgroundColor: account.color ?? undefined }}
                    />
                    {account.name}
                  </span>
                </button>
              ))}
          </div>
          <FieldError>{errors.destinationAccountId}</FieldError>
        </div>
      ) : null}
    </>
  );

  const dateSection = (
    <div className="space-y-1">
      <label className="text-xs font-medium text-muted-foreground">Date</label>
      <Popover>
        <PopoverTrigger
          render={
            <button
              type="button"
              className="flex h-10 w-full items-center gap-2 rounded-lg border border-input bg-background px-3 text-left text-sm transition-colors hover:bg-muted/50"
            >
              <CalendarIcon className="size-4 shrink-0 text-muted-foreground" />
              {format(date, "MMM d, yyyy")}
            </button>
          }
        />
        <PopoverContent className="w-auto p-0">
          <Calendar mode="single" selected={date} onSelect={(d) => d && setDate(d)} />
        </PopoverContent>
      </Popover>
    </div>
  );

  // Compact date trigger for the category row.
  const compactDateSection = (
    <Popover>
      <PopoverTrigger
        render={
          <button
            type="button"
            title={format(date, "MMM d, yyyy")}
            className="flex h-10 shrink-0 items-center gap-1.5 rounded-lg border border-input bg-background px-2.5 text-xs transition-colors hover:bg-muted/50"
          >
            <CalendarIcon className="size-4 shrink-0 text-muted-foreground" />
            <span className="tabular-nums">{format(date, "MMM d")}</span>
          </button>
        }
      />
      <PopoverContent className="w-auto p-0">
        <Calendar mode="single" selected={date} onSelect={(d) => d && setDate(d)} />
      </PopoverContent>
    </Popover>
  );

  // =========================================================================================
  // Render: repeat section (reference style — toggle, chips, every-N, ends)
  // =========================================================================================
  const repeatSection = (
    <div className="space-y-3">
      <button
        type="button"
        onClick={toggleRepeat}
        className={cn(
          "flex w-full items-center gap-2 rounded-lg border px-3 py-2.5 text-sm transition-all",
          repeatEnabled
            ? "border-primary/40 bg-primary/5 text-primary"
            : "border-border/50 text-muted-foreground hover:bg-muted/50",
        )}
      >
        <RepeatIcon className="size-4 shrink-0" />
        <span className="font-medium">Repeats</span>
        <div
          className={cn(
            "ml-auto h-5 w-9 rounded-full p-0.5 transition-colors",
            repeatEnabled ? "bg-primary" : "bg-muted",
          )}
        >
          <div
            className={cn(
              "size-4 rounded-full bg-white shadow transition-transform",
              repeatEnabled && "translate-x-4",
            )}
          />
        </div>
      </button>

      {repeatEnabled ? (
        <div className="animate-in slide-in-from-top-1 space-y-3 pl-1">
          {/* Frequency chips */}
          <div className="flex gap-1.5">
            {(["daily", "weekly", "monthly", "yearly"] as Frequency[]).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => {
                  setFrequency(f);
                  if (f === "monthly") setDayOfMonth(String(date.getDate()));
                  if (f === "weekly") setDayOfWeek(String(date.getDay()));
                }}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition-all",
                  frequency === f
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted text-muted-foreground hover:text-foreground",
                )}
              >
                {f}
              </button>
            ))}
          </div>

          {/* Every N */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Every</span>
            <input
              type="number"
              min={1}
              max={99}
              value={interval}
              onChange={(e) => setInterval(String(Math.max(1, parseInt(e.target.value) || 1)))}
              className="h-8 w-14 rounded-lg border border-input bg-background px-2 text-center text-xs"
            />
            <span className="text-xs text-muted-foreground">
              {parsedInterval === 1
                ? FREQUENCY_NOUN[frequency].one
                : FREQUENCY_NOUN[frequency].many}
            </span>
          </div>

          {/* Weekly day picker */}
          {frequency === "weekly" ? (
            <div className="flex gap-1">
              {WEEKDAY_OPTIONS.map((d) => (
                <button
                  key={d.value}
                  type="button"
                  onClick={() => setDayOfWeek(d.value)}
                  className={cn(
                    "flex-1 rounded-lg py-1.5 text-[11px] font-medium transition-all",
                    dayOfWeek === d.value
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:text-foreground",
                  )}
                >
                  {d.label}
                </button>
              ))}
            </div>
          ) : null}

          {/* Monthly day-of-month */}
          {frequency === "monthly" ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">On day</span>
              <input
                type="number"
                min={1}
                max={31}
                value={dayOfMonth}
                onChange={(e) => setDayOfMonth(e.target.value)}
                className="h-8 w-16 rounded-lg border border-input bg-background px-2 text-center text-xs"
              />
              <span className="text-xs text-muted-foreground">of the month</span>
            </div>
          ) : null}

          {/* Ends */}
          <div className="space-y-1.5">
            <span className="text-xs text-muted-foreground">Ends</span>
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setEndMode("never");
                  setEndDate(null);
                }}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-xs font-medium transition-all",
                  endMode === "never"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:text-foreground",
                )}
              >
                Never
              </button>
              <button
                type="button"
                onClick={() => setEndMode("date")}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-xs font-medium transition-all",
                  endMode === "date"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:text-foreground",
                )}
              >
                On date
              </button>
            </div>
            {endMode === "date" ? (
              <Popover>
                <PopoverTrigger
                  render={
                    <button
                      type="button"
                      className="flex h-9 w-full items-center gap-2 rounded-lg border border-input bg-background px-3 text-left text-xs transition-colors hover:bg-muted/50"
                    >
                      <CalendarIcon className="size-3.5 shrink-0 text-muted-foreground" />
                      {endDate ? format(endDate, "MMM d, yyyy") : "Pick end date"}
                    </button>
                  }
                />
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={endDate ?? undefined}
                    onSelect={(d) => d && setEndDate(d)}
                  />
                </PopoverContent>
              </Popover>
            ) : null}
          </div>

          {/* Auto-post */}
          <label className="flex cursor-pointer items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked={autoPost}
              onChange={(e) => setAutoPost(e.target.checked)}
              className="mt-0.5 size-4 accent-primary"
            />
            <span>
              Auto-post when due
              <span className="block text-xs text-muted-foreground">
                {accountId === ""
                  ? "Needs an account — occurrences will be logged only until you pick one."
                  : splitEnabled && participants.length >= 2
                    ? "Each occurrence records the full split — shares and debts are created automatically."
                    : "Occurrences will be recorded automatically (even when the app is closed)."}
              </span>
            </span>
          </label>

          {/* Plain-language summary */}
          <p className="text-xs italic leading-relaxed text-muted-foreground">
            Repeats{" "}
            {frequency === "weekly"
              ? `on ${WEEKDAY_OPTIONS.find((d) => d.value === dayOfWeek)?.label ?? "…"}${parsedInterval > 1 ? ` every ${parsedInterval} weeks` : ""}`
              : frequency === "monthly"
                ? `on day ${parsedDayOfMonth}${parsedInterval > 1 ? ` every ${parsedInterval} months` : ""}`
                : parsedInterval > 1
                  ? `every ${parsedInterval} ${FREQUENCY_NOUN[frequency].many}`
                  : frequency}
            , starting {format(date, "MMM d")},
            {endMode === "date" && endDate
              ? ` until ${format(endDate, "MMM d, yyyy")}`
              : " until you cancel"}
            .
          </p>
          <FieldError>{errors.repeat}</FieldError>
        </div>
      ) : null}
    </div>
  );

  // =========================================================================================
  // Render: split section — same toggle style, inline in the expense form
  // =========================================================================================
  const splitSection = (
    <div className="space-y-3">
      <button
        type="button"
        onClick={toggleSplit}
        className={cn(
          "flex w-full items-center gap-2 rounded-lg border px-3 py-2.5 text-sm transition-all",
          splitEnabled
            ? "border-primary/40 bg-primary/5 text-primary"
            : "border-border/50 text-muted-foreground hover:bg-muted/50",
        )}
      >
        <UsersIcon className="size-4 shrink-0" />
        <span className="font-medium">Split with friends</span>
        {splitEnabled && activeCount > 0 ? (
          <Badge variant="secondary" className="text-[10px]">
            {activeCount}
          </Badge>
        ) : null}
        <div
          className={cn(
            "ml-auto h-5 w-9 rounded-full p-0.5 transition-colors",
            splitEnabled ? "bg-primary" : "bg-muted",
          )}
        >
          <div
            className={cn(
              "size-4 rounded-full bg-white shadow transition-transform",
              splitEnabled && "translate-x-4",
            )}
          />
        </div>
      </button>

      {splitEnabled ? (
        <div className="animate-in slide-in-from-top-1 space-y-3 pl-1">
          {/* Per-person estimate */}
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              {activeCount} {activeCount === 1 ? "person" : "people"}
            </p>
            {perPersonEqual > 0 ? (
              <p className="text-xs text-muted-foreground">
                ≈ {perPersonEqual.toFixed(2)} {currency} each (equal)
              </p>
            ) : null}
          </div>

          {/* Self (pinned) */}
          <div className="flex items-center gap-3 rounded-lg border border-primary/15 bg-primary/5 px-3 py-2">
            <div className="flex size-7 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
              You
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">You</p>
              <p className="text-[10px] text-muted-foreground">Always included</p>
            </div>
            <CheckIcon className="size-4 text-primary" />
          </div>

          {/* Selected participants */}
          {participants.filter((p) => p.userId !== selfUserId).length > 0 ? (
            <div className="space-y-1">
              {participants
                .filter((p) => p.userId !== selfUserId)
                .map((p) => (
                  <div
                    key={p.key}
                    className="flex items-center gap-3 rounded-lg border border-primary/15 bg-primary/5 px-3 py-2"
                  >
                    <div className="flex size-7 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                      {participantName(p).charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{participantName(p)}</p>
                      {p.contactId != null ? (
                        <p className="text-[10px] text-muted-foreground">not on Ledgr yet</p>
                      ) : null}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => removeParticipant(p.key)}
                    >
                      <XIcon className="size-4" />
                    </Button>
                  </div>
                ))}
            </div>
          ) : null}

          {/* Search people — app users and contacts combined (deduped server-side) */}
          <Input
            placeholder="Search people…"
            value={friendQuery}
            onChange={(e) => setFriendQuery(e.target.value)}
            className="h-9 text-sm"
          />
          {friendSearch.isFetching ? (
            <p className="text-xs text-muted-foreground">Searching…</p>
          ) : null}
          {searchResults.length > 0 ? (
            <div className="overflow-hidden rounded-lg border">
              {searchResults.map((result) => {
                const added =
                  result.kind === "user"
                    ? participants.some((p) => p.userId === result.id)
                    : participants.some((p) => p.contactId === result.id);
                return (
                  <button
                    key={`${result.kind}-${result.id}`}
                    type="button"
                    disabled={added}
                    className={cn(
                      "flex w-full items-center justify-between px-3 py-2 text-left text-sm transition-colors",
                      added ? "opacity-50" : "hover:bg-accent",
                    )}
                    onClick={() =>
                      result.kind === "user"
                        ? addSearchResult(result.id, result.name)
                        : addContactParticipant(result.id, result.name)
                    }
                  >
                    <span className="flex items-center gap-2">
                      {result.name}
                      {result.kind === "contact" ? (
                        <Badge variant="secondary" className="text-[9px]">
                          contact
                        </Badge>
                      ) : null}
                    </span>
                    {added ? (
                      <CheckIcon className="size-4 text-primary" />
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        {result.kind === "contact"
                          ? "not on Ledgr yet"
                          : result.username
                            ? `@${result.username}`
                            : ""}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ) : null}

          {/* Saved (unlinked) contacts as one-tap chips */}
          {savedContacts.length > 0 ? (
            <div className="space-y-1">
              <p className="px-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                Your contacts (not on Ledgr yet)
              </p>
              <div className="flex flex-wrap gap-1.5">
                {savedContacts.map((contact) => {
                  const added = participants.some((p) => p.contactId === contact.id);
                  return (
                    <button
                      key={contact.id}
                      type="button"
                      disabled={added}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors",
                        added
                          ? "cursor-default border-primary/30 bg-primary/5 opacity-70"
                          : "hover:bg-accent",
                      )}
                      onClick={() => addContactParticipant(contact.id, contact.name)}
                    >
                      {added ? (
                        <CheckIcon className="size-3" />
                      ) : (
                        <ContactIcon className="size-3" />
                      )}
                      {contact.name}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

{/* Custom friend */}
          <p className="text-xs text-muted-foreground">
            Add friends from your contacts — when they join Ledgr they are
            linked to their account automatically.
          </p>

          {/* Split method */}
          <div className="space-y-1.5">
            <span className="text-xs text-muted-foreground">Split by</span>
            <div className="flex gap-1 rounded-xl bg-muted/50 p-1">
              {(["equal", "exact", "percentage", "shares"] as SplitMethod[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMethod(m)}
                  className={cn(
                    "flex-1 rounded-lg py-1.5 text-[11px] font-medium capitalize transition-all",
                    method === m
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* Per-person shares (with inputs for exact/percentage) */}
          {participants.length >= 2 && (method !== "equal" || shares.length > 0) ? (
            <div className="space-y-1.5">
              {participants.map((p) => {
                const share = shares.find(
                  (s) =>
                    (p.userId != null && s.userId === p.userId) ||
                    (p.contactId != null && s.contactId === p.contactId),
                );
                const isSelf = p.userId != null && p.userId === selfUserId;
                return (
                  <div key={p.key} className="flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium">
                        {participantName(p)}
                        {isSelf ? (
                          <Badge variant="secondary" className="ml-1.5 px-1 py-0 text-[9px]">
                            you
                          </Badge>
                        ) : null}
                      </p>
                    </div>
                    {method === "equal" || method === "shares" ? (
                      <span className="text-xs font-semibold tabular-nums">
                        {share?.amount ?? "—"}
                      </span>
                    ) : (
                      <Input
                        className="h-7 w-24 text-right text-xs"
                        inputMode="decimal"
                        placeholder={method === "percentage" ? "%" : currency}
                        value={p.shareValue}
                        onChange={(e) =>
                          setParticipants((prev) =>
                            prev.map((row) =>
                              row.key === p.key ? { ...row, shareValue: e.target.value } : row,
                            ),
                          )
                        }
                      />
                    )}
                  </div>
                );
              })}

              {/* Reconciliation */}
              {shares.length > 0 ? (
                <div
                  className={cn(
                    "rounded-lg p-2 text-xs",
                    method === "exact" || method === "percentage"
                      ? sharesReconcile
                        ? "bg-emerald-500/10 text-emerald-600"
                        : "bg-amber-500/10 text-amber-600"
                      : "bg-muted/30 text-muted-foreground",
                  )}
                >
                  {method === "exact" || method === "percentage"
                    ? sharesReconcile
                      ? `✓ Splits to ${shareSum.toFixed(2)} of ${parsedAmount.toFixed(2)}`
                      : `Total ${shareSum.toFixed(2)} — must equal ${parsedAmount.toFixed(2)}`
                    : `Splits to ${shareSum.toFixed(2)} of ${parsedAmount.toFixed(2)}`}
                </div>
              ) : null}
            </div>
          ) : null}

          <FieldError>{errors.split}</FieldError>
          <p className="text-xs italic leading-relaxed text-muted-foreground">
            Your share counts as your expense — the rest is tracked as money owed to you, never as
            extra income.
          </p>
        </div>
      ) : null}
    </div>
  );

  // =========================================================================================
  // Render: notes (collapsed by default)
  // =========================================================================================
  const notesSection = !showNotes ? (
    <button
      type="button"
      onClick={() => setShowNotes(true)}
      className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
    >
      <PencilIcon className="size-3" /> Add note
    </button>
  ) : (
    <div className="space-y-1">
      <label className="text-xs font-medium text-muted-foreground">Notes</label>
      <Textarea
        placeholder="Optional notes..."
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        className="min-h-[60px] resize-none text-sm"
      />
    </div>
  );

  // =========================================================================================
  // Render: the form (all three modes — sections shown per mode)
  // =========================================================================================
  const renderForm = () => (
    <form id="transaction-form" className="space-y-4 p-5" onSubmit={submit}>
      {bigAmountInput(amount, setAmount)}
      {descriptionInput}
      {mode === "transfer" ? (
        dateSection
      ) : (
        <div className="flex items-end gap-3">
          {categoryPickerSection}
          {compactDateSection}
        </div>
      )}
      {accountSection}

      {/* Inline optional sections — expense only, same toggle style */}
      {mode === "expense" ? splitSection : null}
      {mode !== "transfer" ? repeatSection : null}

      {notesSection}
      <FieldError>{errors.repeat}</FieldError>
    </form>
  );

  // =========================================================================================
  // Dialog title / back button
  // =========================================================================================
  const getDialogTitle = () => {
    if (mode) {
      return mode === "expense" ? "Add expense" : mode === "income" ? "Add income" : "Transfer";
    }
    return "New transaction";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85dvh] flex-col gap-0 overflow-hidden p-0 shadow-xl shadow-black/20 sm:max-w-sm">
        <DialogHeader className="flex-row items-center gap-3 border-b border-border/50 px-5 py-3.5">
          {mode != null ? (
            <button
              type="button"
              onClick={() => {
                setMode(null);
                setErrors({});
              }}
              className="flex size-7 items-center justify-center rounded-lg transition-colors hover:bg-muted"
            >
              <ArrowLeftIcon className="size-4" />
            </button>
          ) : null}
          <DialogTitle className="text-base">{getDialogTitle()}</DialogTitle>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {mode === null ? renderTypePicker() : renderForm()}
        </div>

        {mode != null ? (
          <DialogFooter className="-mx-0 -mb-0 rounded-none px-5 py-4">
            <Button
              type="submit"
              form="transaction-form"
              className="h-11 w-full rounded-xl font-medium"
              disabled={creatingTransaction || creatingRule}
            >
              {creatingTransaction || creatingRule ? (
                <Loader2Icon className="size-4 animate-spin" />
              ) : null}
              {repeatEnabled
                ? `${
                    mode === "expense"
                      ? "Add expense"
                      : mode === "income"
                        ? "Add income"
                        : "Transfer"
                  } & repeat`
                : mode === "expense"
                  ? splitEnabled && participants.length >= 2
                    ? "Add expense & split"
                    : "Add expense"
                  : mode === "income"
                    ? "Add income"
                    : "Transfer"}
            </Button>
          </DialogFooter>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
