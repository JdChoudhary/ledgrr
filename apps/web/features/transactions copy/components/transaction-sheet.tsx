"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { toast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  CalendarIcon,
  ArrowLeft,
  Check,
  Loader2,
  Pencil,
  Repeat,
} from "lucide-react";
import { format } from "date-fns";
import { formatCurrency } from "@/lib/currency";
import { cn } from "@/lib/utils";
import { TransactionTypePicker } from "./transaction-type-picker";
import { AccountPicker } from "./account-picker";
import { CategoryPicker } from "./category-picker";
import type {
  Transaction,
  Category,
  CategoryGroup,
  Account,
  CurrencySettings,
} from "@/features/transactions/lib/types";
import type { Friend as BillSplitFriend } from "@/features/bill-splits/lib/types";

type TxMode = "expense" | "income" | "transfer" | "split" | null;
type SplitStep = "details" | "participants" | "split-method" | "review";

interface TransactionSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface TransactionsPageResponse {
  items: Transaction[];
  nextCursor: string | null;
  hasMore: boolean;
}

// ── Standard form state ─────────────────────────────────────
interface StdFormState {
  amount: string;
  description: string;
  categoryId: string;   // UUID — sent in payload
  categoryName: string;  // display-only, looked up from categories array
  accountId: string;
  toAccountId: string;
  date: Date;
  notes: string;
  showNotes: boolean;
  // Recurring
  isRecurring: boolean;
  frequency: "daily" | "weekly" | "monthly" | "yearly";
  interval: number;
  endDate: Date | null;
  endMode: "never" | "date";
}

type Frequency = "daily" | "weekly" | "monthly" | "yearly";

const defaultStdForm = (): StdFormState => ({
  amount: "",
  description: "",
  categoryId: "",
  categoryName: "",
  accountId: "",
  toAccountId: "",
  date: new Date(),
  notes: "",
  showNotes: false,
  isRecurring: false,
  frequency: "monthly",
  interval: 1,
  endDate: null,
  endMode: "never",
});

// ── Split form state ────────────────────────────────────────
interface SplitFormState {
  step: SplitStep;
  amount: string;
  description: string;
  category: string;
  accountId: string;
  date: Date;
  participantIds: string[];
  friendSearch: string;
  splitMethod: "equal" | "percentage" | "exact" | "shares";
  exactAmounts: Record<string, string>;
  percentageAmounts: Record<string, string>;
  shareAmounts: Record<string, string>;
}

const defaultSplitForm = (): SplitFormState => ({
  step: "details",
  amount: "",
  description: "",
  category: "",
  accountId: "",
  date: new Date(),
  participantIds: [],
  friendSearch: "",
  splitMethod: "equal",
  exactAmounts: {},
  percentageAmounts: {},
  shareAmounts: {},
});

// ── Last used type (session memory) ─────────────────────────
let lastUsedType: TxMode = "expense";

// ── Main Component ──────────────────────────────────────────
export function TransactionSheet({ open, onOpenChange }: TransactionSheetProps) {
  const queryClient = useQueryClient();
  const amountRef = useRef<HTMLInputElement>(null);

  const [mode, setMode] = useState<TxMode>(null);
  const [stdForm, setStdForm] = useState<StdFormState>(defaultStdForm);
  const [splitForm, setSplitForm] = useState<SplitFormState>(defaultSplitForm);
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [customCategoryName, setCustomCategoryName] = useState("");
  const [stepHistory, setStepHistory] = useState<SplitStep[]>([]);

  // ── Queries ────────────────────────────────────────────────
  const { data: accounts = [] } = useQuery<Account[]>({
    queryKey: ["accounts"],
    queryFn: () => api.get("/api/accounts"),
    enabled: open,
  });

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["categories"],
    queryFn: () => api.get("/api/category"),
    enabled: open,
  });

  const { data: categoryGroups = [] } = useQuery<CategoryGroup[]>({
    queryKey: ["categoryGroups"],
    queryFn: () => api.get("/api/category-groups"),
    enabled: open,
  });

  const { data: currencySettings } = useQuery<CurrencySettings | null>({
    queryKey: ["settings"],
    queryFn: () => api.get("/api/settings"),
    throwOnError: false,
    enabled: open,
  });

  const { data: friendsData = [] } = useQuery<{ friend: BillSplitFriend }[]>({
    queryKey: ["friends", "friends"],
    queryFn: () => api.get("/api/friends?type=friends"),
    enabled: open && mode === "split",
  });

  const { data: sessionData } = useQuery<{ user: { id: string } }>({
    queryKey: ["session"],
    queryFn: () => api.get("/api/auth/get-session"),
    throwOnError: false,
    enabled: open,
  });

  const friends: BillSplitFriend[] = useMemo(
    () => friendsData.map((f) => f.friend).filter(Boolean) as BillSplitFriend[],
    [friendsData]
  );

  const userId = sessionData?.user?.id || "";
  const fmt = (amount: number) => formatCurrency(amount, currencySettings);

  // ── Auto-select first account ──────────────────────────────
  useEffect(() => {
    if (open && accounts.length > 0) {
      if (!stdForm.accountId) {
        setStdForm((prev) => ({ ...prev, accountId: accounts[0].id }));
      }
      if (!splitForm.accountId) {
        setSplitForm((prev) => ({ ...prev, accountId: accounts[0].id }));
      }
    }
  }, [open, accounts]);

  // ── Auto-focus amount on open / mode change ────────────────
  useEffect(() => {
    if (open && mode && mode !== "split") {
      setTimeout(() => amountRef.current?.focus(), 100);
    }
  }, [open, mode]);

  // ── Description autocomplete ───────────────────────────────
  const { data: txPages } = useInfiniteQuery<TransactionsPageResponse>({
    queryKey: ["transactions"],
    queryFn: ({ pageParam }) => {
      const cursor = pageParam as string | undefined;
      const url = cursor
        ? `/api/transactions?cursor=${encodeURIComponent(cursor)}&limit=50`
        : "/api/transactions?limit=50";
      return api.get(url);
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: open,
  });

  const allTxs: Transaction[] = useMemo(
    () => txPages?.pages.flatMap((p) => p.items) ?? [],
    [txPages]
  );

  const descriptionSuggestions = useMemo(() => {
    const seen = new Set<string>();
    return allTxs
      .filter((t) => { if (seen.has(t.description)) return false; seen.add(t.description); return true; })
      .slice(0, 8)
      .map((t) => t.description);
  }, [allTxs]);

  const activeDescription = mode === "split" ? splitForm.description : stdForm.description;
  const filteredSuggestions = useMemo(() => {
    if (!activeDescription.trim()) return [];
    const q = activeDescription.toLowerCase();
    return descriptionSuggestions.filter((d) => d.toLowerCase().includes(q) && d.toLowerCase() !== q).slice(0, 5);
  }, [activeDescription, descriptionSuggestions]);

  // ── Mutations ──────────────────────────────────────────────
  const createTxMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => api.post("/api/transactions", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      toast.success(mode === "expense" ? "Expense added" : mode === "income" ? "Income added" : "Transfer complete");
      closeSheet();
    },
    onError: () => toast.error("Failed to save — check your input and try again"),
  });

  const createRecurringMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => api.post("/api/transactions/recurring", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["recurring-rules"] });
      toast.success(mode === "expense" ? "Recurring expense added" : mode === "income" ? "Recurring income added" : "Recurring transfer set up");
      closeSheet();
    },
    onError: () => toast.error("Failed to save — check your input and try again"),
  });

  const createSplitMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => api.post("/api/bill-splits", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["bill-splits"] });
      const n = splitForm.participantIds.length + 1;
      const perPerson = parseFloat(splitForm.amount) / n;
      toast.success(`Split added — ${splitForm.participantIds.length} people owe you ${fmt(perPerson)} each`);
      closeSheet();
    },
    onError: () => toast.error("Failed to create split — check your input"),
  });

  // ── Helpers ────────────────────────────────────────────────
  const closeSheet = useCallback(() => {
    onOpenChange(false);
    setTimeout(() => {
      setMode(null);
      setStdForm(defaultStdForm());
      setSplitForm(defaultSplitForm());
      setIsCustomCategory(false);
      setCustomCategoryName("");
      setStepHistory([]);
    }, 200);
  }, [onOpenChange]);

  const isPending = createTxMutation.isPending || createRecurringMutation.isPending;

  const handleTypeSelect = (type: "expense" | "income" | "transfer" | "split") => {
    lastUsedType = type;
    setMode(type);
    setIsCustomCategory(false);
    setCustomCategoryName("");
    if (type !== "split") {
      setStdForm((prev) => ({ ...prev, categoryId: "", categoryName: "", toAccountId: "" }));
    }
  };

  const updateStd = (patch: Partial<StdFormState>) => setStdForm((p) => ({ ...p, ...patch }));
  const updateSplit = (patch: Partial<SplitFormState>) => setSplitForm((p) => ({ ...p, ...patch }));

  // ── Split computations ─────────────────────────────────────
  const allParticipants = useMemo(() => [userId, ...splitForm.participantIds], [userId, splitForm.participantIds]);
  const splitAmount = parseFloat(splitForm.amount) || 0;

  const splitAmounts = useMemo(() => {
    const r: Record<string, number> = {};
    const n = allParticipants.length;
    if (n === 0) return r;
    if (splitForm.splitMethod === "equal") {
      const each = splitAmount / n;
      for (const id of allParticipants) r[id] = each;
    } else if (splitForm.splitMethod === "exact") {
      for (const id of allParticipants) r[id] = parseFloat(splitForm.exactAmounts[id] || "0") || 0;
    } else if (splitForm.splitMethod === "percentage") {
      for (const id of allParticipants) r[id] = (parseFloat(splitForm.percentageAmounts[id] || "0") / 100) * splitAmount;
    } else {
      const totalShares = allParticipants.reduce((s, id) => s + (parseFloat(splitForm.shareAmounts[id] || "1") || 1), 0);
      for (const id of allParticipants) r[id] = totalShares > 0 ? ((parseFloat(splitForm.shareAmounts[id] || "1") || 1) / totalShares) * splitAmount : 0;
    }
    return r;
  }, [splitForm, allParticipants, splitAmount]);

  const splitTotal = Object.values(splitAmounts).reduce((s, v) => s + v, 0);
  const splitDiff = splitAmount - splitTotal;
  const splitBalanced = Math.abs(splitDiff) < 0.01;
  const getFriendName = (id: string) => id === userId ? "You" : friends.find((f) => f.id === id)?.name || "Unknown";

  // ── Active form state (shared between standard and split) ──
  const activeAmount = mode === "split" ? splitForm.amount : stdForm.amount;
  const activeAccountId = mode === "split" ? splitForm.accountId : stdForm.accountId;
  const activeDate = mode === "split" ? splitForm.date : stdForm.date;

  // ── Submit handlers ────────────────────────────────────────
  const handleStandardSubmit = () => {
    if (!stdForm.amount || parseFloat(stdForm.amount) <= 0) return toast.error("Enter a valid amount");
    if (!stdForm.description.trim()) return toast.error("Enter a description");
    if (mode !== "transfer" && !stdForm.accountId) return toast.error("Select an account");
    if (mode === "transfer" && (!stdForm.accountId || !stdForm.toAccountId)) return toast.error("Select both accounts");
    if (mode === "transfer" && stdForm.accountId === stdForm.toAccountId) return toast.error("Accounts must differ");

    // Send categoryId (UUID) if selected, or category name for custom
    const catId = isCustomCategory ? null : stdForm.categoryId;
    const catName = isCustomCategory ? customCategoryName.trim() : stdForm.categoryName;
    const data: Record<string, unknown> = {
      amount: parseFloat(stdForm.amount),
      date: stdForm.date.toISOString().split("T")[0],
      description: stdForm.description.trim(),
      type: mode,
      accountId: stdForm.accountId,
    };
    if (catId) {
      data.categoryId = catId;
    } else if (catName) {
      data.category = catName;
    }
    if (mode === "transfer") data.toAccountId = stdForm.toAccountId;
    if (stdForm.notes.trim()) data.notes = stdForm.notes.trim();
    if (stdForm.isRecurring) {
      data.frequency = stdForm.frequency;
      data.interval = stdForm.interval;
      if (stdForm.endMode === "date" && stdForm.endDate) {
        data.endDate = stdForm.endDate.toISOString().split("T")[0];
      }
      createRecurringMutation.mutate(data);
    } else {
      createTxMutation.mutate(data);
    }
  };

  const handleSplitSubmit = () => {
    if (!splitForm.amount || parseFloat(splitForm.amount) <= 0) return toast.error("Enter a valid amount");
    if (!splitForm.description.trim()) return toast.error("Enter a description");
    if (!splitForm.accountId) return toast.error("Select an account");
    if (allParticipants.length < 2) return toast.error("Add at least one participant");
    if (!splitBalanced) return toast.error(`Split doesn't balance — ${fmt(Math.abs(splitDiff))} ${splitDiff > 0 ? "short" : "excess"}`);

    const shares = allParticipants.map((id) => ({ userId: id, amount: String(splitAmounts[id].toFixed(2)), isOwner: id === userId }));
    createSplitMutation.mutate({
      action: "create",
      title: splitForm.description.trim(),
      totalAmount: String(splitAmount),
      splitMethod: splitForm.splitMethod,
      accountId: splitForm.accountId,
      categoryId: splitForm.category || null,
      date: splitForm.date.toISOString().split("T")[0],
      shares,
    });
  };

  // ── Split step nav ─────────────────────────────────────────
  const goToStep = (step: SplitStep) => { setStepHistory((h) => [...h, splitForm.step]); updateSplit({ step }); };
  const goBack = () => { const prev = stepHistory[stepHistory.length - 1]; if (prev) { setStepHistory((h) => h.slice(0, -1)); updateSplit({ step: prev }); } };

  // ── Render: Category picker section ────────────────────────
  // Look up category name from ID for display
  const activeCategoryId = mode === "split" ? splitForm.category : stdForm.categoryId;
  const activeCategoryName = mode === "split"
    ? splitForm.category
      ? categories.find((c) => c.id === splitForm.category)?.name || splitForm.category
      : ""
    : stdForm.categoryName;

  const renderCategorySection = () => {
    if (mode === "transfer") return null;
    const catSetter = (id: string) => {
      if (mode === "split") {
        updateSplit({ category: id });
      } else {
        const cat = categories.find((c) => c.id === id);
        updateStd({ categoryId: id, categoryName: cat?.name || "" });
      }
    };
    return (
      <div className="space-y-2">
        <label className="text-xs font-medium text-muted-foreground">
          {mode === "income" ? "Category (optional)" : "Category"}
        </label>
        <CategoryPicker
          categories={categories}
          categoryGroups={categoryGroups}
          selectedId={activeCategoryId}
          onSelect={catSetter}
          onCustom={() => setIsCustomCategory(true)}
          isCustom={isCustomCategory}
          customValue={customCategoryName}
          onCustomValueChange={setCustomCategoryName}
          onCancelCustom={() => { setIsCustomCategory(false); setCustomCategoryName(""); }}
          txType={mode === "income" ? "income" : "expense"}
        />
      </div>
    );
  };

  // ── Render: Account section ────────────────────────────────
  const renderAccountSection = () => {
    const accountSetter = (id: string) => mode === "split" ? updateSplit({ accountId: id }) : updateStd({ accountId: id });
    const label = mode === "transfer" ? "From account" : mode === "income" ? "Deposit to" : "Pay from";
    return (
      <>
        <AccountPicker accounts={accounts} selectedAccountId={activeAccountId} onSelect={accountSetter} currencySettings={currencySettings} label={label} />
        {mode === "transfer" && (
          <AccountPicker accounts={accounts} selectedAccountId={stdForm.toAccountId} onSelect={(id) => updateStd({ toAccountId: id })} currencySettings={currencySettings} excludeAccountId={stdForm.accountId} label="To account" />
        )}
      </>
    );
  };

  // ── Render: Date section ───────────────────────────────────
  const renderDateSection = () => {
    const dateSetter = (d: Date) => mode === "split" ? updateSplit({ date: d }) : updateStd({ date: d });
    return (
      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">Date</label>
        <Popover>
          <PopoverTrigger
            render={
              <button type="button" className="w-full flex items-center gap-2 h-10 px-3 rounded-lg border border-input bg-background text-sm text-left hover:bg-muted/50 transition-colors">
                <CalendarIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                {format(activeDate, "MMM d, yyyy")}
              </button>
            }
          />
          <PopoverContent className="w-auto p-0">
            <Calendar mode="single" selected={activeDate} onSelect={(d) => d && dateSetter(d)} />
          </PopoverContent>
        </Popover>
      </div>
    );
  };

  // ── Render: Type Picker ────────────────────────────────────
  const renderTypePicker = () => (
    <div className="p-5 space-y-4 h-full">
      <p className="text-sm text-muted-foreground text-center">What are you logging?</p>
      <TransactionTypePicker onSelect={handleTypeSelect} />
    </div>
  );

  // ── Render: Standard transaction form ──────────────────────
  const renderStandardForm = () => {
    const baseLabel = mode === "expense" ? "Add expense" : mode === "income" ? "Add income" : "Transfer";
    const submitLabel = stdForm.isRecurring ? `${baseLabel} & repeat` : baseLabel;
    return (
      <form onSubmit={(e) => { e.preventDefault(); handleStandardSubmit(); }} className="p-5 space-y-4">
        {/* Amount */}
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-lg font-medium">{currencySettings?.currencySymbol || "$"}</span>
          <input ref={amountRef} type="number" inputMode="decimal" step="0.01" min="0" placeholder="0.00" value={stdForm.amount} onChange={(e) => updateStd({ amount: e.target.value })} required className="w-full pl-10 pr-4 h-14 text-2xl font-bold tabular-nums bg-transparent border-0 border-b-2 border-border/40 focus:border-primary outline-none transition-colors placeholder:text-muted-foreground/40" />
        </div>

        {/* Description */}
        <div className="relative">
          <Input type="text" placeholder="What was this for?" value={stdForm.description} onChange={(e) => updateStd({ description: e.target.value })} required className="h-10 rounded-lg" />
          {filteredSuggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-background border border-border/50 rounded-lg shadow-lg z-50 overflow-hidden">
              {filteredSuggestions.map((s, i) => (
                <button key={i} type="button" onClick={() => updateStd({ description: s })} className="w-full text-left px-3 py-2 text-xs hover:bg-muted/50 transition-colors">{s}</button>
              ))}
            </div>
          )}
        </div>

        {renderCategorySection()}
        {renderAccountSection()}
        {renderDateSection()}

        {/* ── Recurring toggle ──────────────────────────────── */}
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => updateStd({ isRecurring: !stdForm.isRecurring })}
            className={cn(
              "flex items-center gap-2 w-full px-3 py-2.5 rounded-lg border text-sm transition-all",
              stdForm.isRecurring
                ? "border-primary/40 bg-primary/5 text-primary"
                : "border-border/50 text-muted-foreground hover:bg-muted/50"
            )}
          >
            <Repeat className="h-4 w-4 shrink-0" />
            <span className="font-medium">Repeats</span>
            <div className={cn(
              "ml-auto h-5 w-9 rounded-full p-0.5 transition-colors",
              stdForm.isRecurring ? "bg-primary" : "bg-muted"
            )}>
              <div className={cn(
                "h-4 w-4 rounded-full bg-white shadow transition-transform",
                stdForm.isRecurring && "translate-x-4"
              )} />
            </div>
          </button>

          {stdForm.isRecurring && (
            <div className="space-y-3 pl-1 animate-in slide-in-from-top-1">
              {/* Frequency chips */}
              <div className="flex gap-1.5">
                {(["daily", "weekly", "monthly", "yearly"] as const).map((freq) => (
                  <button
                    key={freq}
                    type="button"
                    onClick={() => updateStd({ frequency: freq })}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize",
                      stdForm.frequency === freq
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "bg-muted text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {freq}
                  </button>
                ))}
              </div>

              {/* Interval (show only if > 1) */}
              {stdForm.frequency !== "daily" && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Every</span>
                  <input
                    type="number"
                    min={1}
                    max={99}
                    value={stdForm.interval}
                    onChange={(e) => updateStd({ interval: Math.max(1, parseInt(e.target.value) || 1) })}
                    className="w-14 h-8 px-2 text-xs text-center rounded-lg border border-input bg-background"
                  />
                  <span className="text-xs text-muted-foreground">
                    {stdForm.frequency === "weekly" ? (stdForm.interval === 1 ? "week" : "weeks")
                      : stdForm.frequency === "monthly" ? (stdForm.interval === 1 ? "month" : "months")
                      : (stdForm.interval === 1 ? "year" : "years")}
                  </span>
                </div>
              )}

              {/* Ends */}
              <div className="space-y-1.5">
                <span className="text-xs text-muted-foreground">Ends</span>
                <div className="flex gap-1.5">
                  <button type="button" onClick={() => updateStd({ endMode: "never", endDate: null })}
                    className={cn("px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                      stdForm.endMode === "never" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground")}>Never</button>
                  <button type="button" onClick={() => updateStd({ endMode: "date" })}
                    className={cn("px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                      stdForm.endMode === "date" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground")}>On date</button>
                </div>
                {stdForm.endMode === "date" && (
                  <Popover>
                    <PopoverTrigger render={<button type="button" className="w-full flex items-center gap-2 h-9 px-3 rounded-lg border border-input bg-background text-xs text-left hover:bg-muted/50 transition-colors" />}>
                      <CalendarIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      {stdForm.endDate ? format(stdForm.endDate, "MMM d, yyyy") : "Pick end date"}
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar mode="single" selected={stdForm.endDate ?? undefined} onSelect={(d) => d && updateStd({ endDate: d })} />
                    </PopoverContent>
                  </Popover>
                )}
              </div>

              {/* Plain-language summary */}
              <p className="text-xs text-muted-foreground italic leading-relaxed">
                Repeats {stdForm.frequency}{stdForm.interval > 1 ? ` every ${stdForm.interval} ${stdForm.frequency}s` : ""},
                starting {format(stdForm.date, "MMM d")},
                {stdForm.endMode === "date" && stdForm.endDate
                  ? ` until ${format(stdForm.endDate, "MMM d, yyyy")}`
                  : " until you cancel"}.
              </p>
            </div>
          )}
        </div>

        {/* Notes (collapsed) */}
        {!stdForm.showNotes ? (
          <button type="button" onClick={() => updateStd({ showNotes: true })} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
            <Pencil className="h-3 w-3" /> Add note
          </button>
        ) : (
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Notes</label>
            <Textarea placeholder="Optional notes..." value={stdForm.notes} onChange={(e) => updateStd({ notes: e.target.value })} className="min-h-[60px] text-sm rounded-lg resize-none" />
          </div>
        )}

        <Button type="submit" className="w-full h-11 rounded-xl font-medium" disabled={isPending}>
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : submitLabel}
        </Button>
      </form>
    );
  };

  // ── Render: Split step 1 — details ─────────────────────────
  const renderSplitStep1 = () => (
    <div className="space-y-4">
      <div className="text-xs text-muted-foreground bg-muted/30 rounded-lg p-3"><strong>Step 1 of 4</strong> — Enter the total amount and who paid</div>
      <form onSubmit={(e) => { e.preventDefault(); goToStep("participants"); }} className="p-5 space-y-4">
        {/* Amount */}
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-lg font-medium">{currencySettings?.currencySymbol || "$"}</span>
          <input ref={amountRef} type="number" inputMode="decimal" step="0.01" min="0" placeholder="0.00" value={splitForm.amount} onChange={(e) => updateSplit({ amount: e.target.value })} required className="w-full pl-10 pr-4 h-14 text-2xl font-bold tabular-nums bg-transparent border-0 border-b-2 border-border/40 focus:border-primary outline-none transition-colors placeholder:text-muted-foreground/40" />
        </div>
        {/* Description */}
        <Input type="text" placeholder="What was this for?" value={splitForm.description} onChange={(e) => updateSplit({ description: e.target.value })} required className="h-10 rounded-lg" />
        {renderCategorySection()}
        {renderAccountSection()}
        {renderDateSection()}
        <Button type="submit" className="w-full h-11 rounded-xl font-medium">Next — pick participants</Button>
      </form>
    </div>
  );

  // ── Render: Split step 2 — participants ────────────────────
  const renderSplitStep2 = () => {
    const filteredFriends = friends.filter((f) => {
      if (!splitForm.friendSearch.trim()) return true;
      const q = splitForm.friendSearch.toLowerCase();
      return f.name?.toLowerCase().includes(q) || f.username?.toLowerCase().includes(q);
    });
    return (
      <div className="p-5 space-y-4">
        <div className="text-xs text-muted-foreground bg-muted/30 rounded-lg p-3"><strong>Step 2 of 4</strong> — Who&apos;s splitting this?</div>
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">{allParticipants.length} people</p>
          {splitAmount > 0 && allParticipants.length > 0 && <p className="text-xs text-muted-foreground">{fmt(splitAmount / allParticipants.length)} each (equal)</p>}
        </div>
        <Input placeholder="Search friends..." value={splitForm.friendSearch} onChange={(e) => updateSplit({ friendSearch: e.target.value })} className="h-9 text-sm rounded-lg" />
        {/* Self (pinned) */}
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-primary/5 border border-primary/15">
          <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">You</div>
          <div className="flex-1"><p className="text-sm font-medium">You</p><p className="text-[10px] text-muted-foreground">Always included</p></div>
          <Check className="h-4 w-4 text-primary" />
        </div>
        {/* Friends */}
        <div className="space-y-1">
          {filteredFriends.map((friend) => {
            const sel = splitForm.participantIds.includes(friend.id);
            return (
              <button key={friend.id} type="button" onClick={() => updateSplit({ participantIds: sel ? splitForm.participantIds.filter((id) => id !== friend.id) : [...splitForm.participantIds, friend.id] })} className={cn("w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors", sel ? "bg-primary/5 border border-primary/15" : "hover:bg-muted/50 border border-transparent")}>
                <div className={cn("h-7 w-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0", sel ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>{friend.name?.[0]?.toUpperCase() || "?"}</div>
                <div className="flex-1 min-w-0"><p className="text-sm font-medium truncate">{friend.name}</p>{friend.username && <p className="text-[10px] text-muted-foreground">@{friend.username}</p>}</div>
                <div className={cn("h-5 w-5 rounded-full border-2 flex items-center justify-center transition-all", sel ? "border-primary bg-primary" : "border-border")}>{sel && <Check className="h-3 w-3 text-primary-foreground" />}</div>
              </button>
            );
          })}
          {filteredFriends.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">{friends.length === 0 ? "Add friends first to split expenses" : "No matching friends"}</p>}
        </div>
        <Button className="w-full h-11 rounded-xl" onClick={() => goToStep("split-method")} disabled={allParticipants.length < 2}>Continue — {allParticipants.length} people</Button>
      </div>
    );
  };

  // ── Render: Split step 3 — split method ────────────────────
  const renderSplitStep3 = () => (
    <div className="p-5 space-y-4">
      <div className="text-xs text-muted-foreground bg-muted/30 rounded-lg p-3"><strong>Step 3 of 4</strong> — How to split</div>
      <div className="flex gap-1 p-1 rounded-xl bg-muted/50">
        {(["equal", "exact", "percentage", "shares"] as const).map((m) => (
          <button key={m} type="button" onClick={() => updateSplit({ splitMethod: m })} className={cn("flex-1 py-2 rounded-lg text-[11px] font-medium transition-all capitalize", splitForm.splitMethod === m ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>{m}</button>
        ))}
      </div>
      <div className="space-y-2">
        {allParticipants.map((id) => (
          <div key={id} className="flex items-center gap-3">
            <div className="flex-1 min-w-0"><p className="text-sm font-medium truncate">{getFriendName(id)}</p></div>
            {splitForm.splitMethod === "equal" || splitForm.splitMethod === "shares" ? (
              <span className="text-sm font-semibold tabular-nums">{fmt(splitAmounts[id] || 0)}</span>
            ) : splitForm.splitMethod === "exact" ? (
              <div className="relative w-28">
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">{currencySettings?.currencySymbol || "$"}</span>
                <input type="number" step="0.01" min="0" value={splitForm.exactAmounts[id] || ""} onChange={(e) => updateSplit({ exactAmounts: { ...splitForm.exactAmounts, [id]: e.target.value } })} className="w-full pl-6 pr-2 h-8 text-sm text-right tabular-nums rounded-lg border border-input bg-background" />
              </div>
            ) : (
              <div className="relative w-24">
                <input type="number" step="1" min="0" value={splitForm.percentageAmounts[id] || ""} onChange={(e) => updateSplit({ percentageAmounts: { ...splitForm.percentageAmounts, [id]: e.target.value } })} className="w-full px-2 h-8 text-sm text-right tabular-nums rounded-lg border border-input bg-background" />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">%</span>
              </div>
            )}
          </div>
        ))}
      </div>
      {splitForm.splitMethod === "exact" && (
        <div className={cn("text-sm p-3 rounded-lg", splitBalanced ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-600")}>
          {splitBalanced ? "✓ Amounts match the total" : `${fmt(splitTotal)} of ${fmt(splitAmount)} allocated — ${splitDiff > 0 ? `${fmt(splitDiff)} remaining` : `${fmt(-splitDiff)} excess`}`}
        </div>
      )}
      <Button className="w-full h-11 rounded-xl" onClick={() => goToStep("review")}>Review split</Button>
    </div>
  );

  // ── Render: Split step 4 — review ──────────────────────────
  const renderSplitStep4 = () => {
    const personalShare = splitAmounts[userId] || 0;
    const accountName = accounts.find((a) => a.id === splitForm.accountId)?.name || "Account";
    return (
      <div className="p-5 space-y-5">
        <div className="text-xs text-muted-foreground bg-muted/30 rounded-lg p-3"><strong>Step 4 of 4</strong> — Review and confirm</div>
        <div className="rounded-xl border border-border/50 overflow-hidden">
          <div className="p-4 bg-muted/20">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Total</p>
            <p className="text-2xl font-bold mt-1">{fmt(splitAmount)}</p>
          </div>
          <div className="p-4 space-y-3">
            <div className="flex items-center justify-between text-sm"><span className="text-muted-foreground">Your share</span><span className="font-semibold text-primary">{fmt(personalShare)}</span></div>
            <div className="flex items-center justify-between text-sm"><span className="text-muted-foreground">Account</span><span className="font-medium">{accountName}</span></div>
            <div className="flex items-center justify-between text-sm"><span className="text-muted-foreground">Date</span><span className="font-medium">{format(splitForm.date, "MMM d, yyyy")}</span></div>
            <div className="flex items-center justify-between text-sm"><span className="text-muted-foreground">Split with</span><span className="font-medium">{allParticipants.length} people</span></div>
          </div>
        </div>
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Per-person breakdown</p>
          {allParticipants.map((id) => (
            <div key={id} className="flex items-center justify-between py-1.5">
              <span className="text-sm">{getFriendName(id)}</span>
              <span className={cn("text-sm font-semibold tabular-nums", id === userId ? "text-primary" : "")}>{fmt(splitAmounts[id] || 0)}</span>
            </div>
          ))}
        </div>
        <div className="text-xs text-muted-foreground leading-relaxed p-3 rounded-lg bg-muted/20 border border-border/30">
          <strong>{fmt(splitAmount)}</strong> will be deducted from <strong>{accountName}</strong>. <strong>{fmt(personalShare)}</strong> counts as your expense — the rest is tracked as money owed to you.
        </div>
        <Button className="w-full h-11 rounded-xl font-medium" onClick={handleSplitSubmit} disabled={createSplitMutation.isPending || !splitBalanced}>
          {createSplitMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirm split"}
        </Button>
      </div>
    );
  };

  // ── Sheet title ────────────────────────────────────────────
  const getSheetTitle = () => {
    if (mode === "split") {
      if (splitForm.step === "participants") return "Who's splitting?";
      if (splitForm.step === "split-method") return "How to split";
      if (splitForm.step === "review") return "Review split";
      return "Split expense";
    }
    return "New transaction";
  };

  const showBackButton = mode === "split" && splitForm.step !== "details";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col">
        <SheetHeader className="px-5 py-4 border-b border-border/50 flex-row items-center gap-3">
          {showBackButton && (
            <button type="button" onClick={goBack} className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-muted transition-colors">
              <ArrowLeft className="h-4 w-4" />
            </button>
          )}
          <SheetTitle className="text-base">{getSheetTitle()}</SheetTitle>
        </SheetHeader>

        <ScrollArea className="flex-1 min-h-0">
          {mode === null ? renderTypePicker() : mode === "split" ? (
            <>
              {splitForm.step === "details" && renderSplitStep1()}
              {splitForm.step === "participants" && renderSplitStep2()}
              {splitForm.step === "split-method" && renderSplitStep3()}
              {splitForm.step === "review" && renderSplitStep4()}
            </>
          ) : renderStandardForm()}
        </ScrollArea>

        {mode && (
          <div className="px-5 py-3 border-t border-border/30">
            <button type="button" onClick={() => { setMode(null); setStdForm(defaultStdForm()); setIsCustomCategory(false); }} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              ← Change type
            </button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
