"use client";

import { useState, useMemo } from "react";
import { format, startOfMonth } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "@/components/ui/toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  CalendarDays,
  List,
  Plus,
  RepeatIcon,
  TrendingDown,
  TrendingUp,
  ArrowUpDown,
  Pause,
} from "lucide-react";
import { useSpaces } from "~/hooks/api/space";
import { useAccounts } from "~/hooks/api/account";
import { useCategoryOptions } from "~/hooks/api/category/hierarchy";
import {
  useCancelRecurringRule,
  useCreateRecurringRule,
  useRecurringRules,
  useRecurringOccurrences,
  useRecurringProjectedOccurrences,
  useResumeRecurringRule,
  useUpdateRecurringRuleStatus,
} from "~/hooks/api/recurring";
import { RecurringRuleList } from "./recurring-rule-list";
import { RecurringFormDialog } from "./recurring-rule-form-dialog";
import { RecurringCalendar } from "./recurring-calendar";
import { OccurrenceList } from "./occurrence-list";
import { OccurrenceDetailPanel } from "./occurrence-detail-panel";
import { AllRulesTable } from "./all-rules-table";
import type { RecurringRule, OccurrenceListItem } from "../lib/types";

type FormState = {
  description: string;
  amount: string;
  type: "income" | "expense" | "transfer";
  frequency: string;
  interval: string;
  accountId: string;
  toAccountId: string;
  categoryId: string;
};

const EMPTY_FORM: FormState = {
  description: "",
  amount: "",
  type: "expense",
  frequency: "monthly",
  interval: "1",
  accountId: "",
  toAccountId: "",
  categoryId: "",
};

/**
 * Recurring page — backed by the real tRPC recurring API (not the legacy
 * `@/lib/api` REST client). Rules are per active space.
 *
 * Two tabs:
 *   - Upcoming: month grid calendar + grouped occurrence lists
 *   - All Rules: flat table with account filter
 */
export function RecurringPage() {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [startDate, setStartDate] = useState<Date | undefined>(new Date());
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [activeTab, setActiveTab] = useState("upcoming");
  // Month shown in the calendar; occurrences are fetched per selected month.
  const [calendarMonth, setCalendarMonth] = useState<Date>(() => startOfMonth(new Date()));
  const [selectedOccurrence, setSelectedOccurrence] =
    useState<OccurrenceListItem | null>(null);
  const [occurrencePanelOpen, setOccurrencePanelOpen] = useState(false);

  const spaces = useSpaces({});
  const space = spaces.spaces?.[0]?.space;
  const spaceId = space?.id;
  const currency = space?.baseCurrency ?? "USD";

  const rulesQuery = useRecurringRules(spaceId ? { spaceId } : undefined);
  const accountsQuery = useAccounts(
    spaceId ? { spaceId, includeArchived: false } : undefined,
  );
  const categories = useCategoryOptions(spaceId ? { spaceId } : undefined);

  // Occurrences for the month shown in the calendar — refetched when it changes.
  const occurrenceMonth = format(calendarMonth, "yyyy-MM");
  const occurrencesQuery = useRecurringOccurrences(
    spaceId ? { spaceId, month: occurrenceMonth } : undefined,
  );
  // Dates the rules are due on, projected from their schedules — this is what
  // fills the calendar's future dates and rules that never auto-post.
  const projectedQuery = useRecurringProjectedOccurrences(
    spaceId ? { spaceId, month: occurrenceMonth } : undefined,
  );

  const fmt = (amount: number) =>
    amount.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const createRule = useCreateRecurringRule({
    onSuccess: () => {
      toast.success("Recurring rule created");
      setIsAddOpen(false);
      setForm(EMPTY_FORM);
      setStartDate(new Date());
      setEndDate(undefined);
    },
    onError: (err) => toast.error(err.message),
  });

  const pauseRule = useUpdateRecurringRuleStatus({
    onSuccess: () => toast.success("Rule paused"),
    onError: (err) => toast.error(err.message),
  });
  const resumeRule = useResumeRecurringRule({
    onSuccess: () => toast.success("Rule resumed"),
    onError: (err) => toast.error(err.message),
  });
  const cancelRule = useCancelRecurringRule({
    onSuccess: () => toast.success("Rule cancelled"),
    onError: (err) => toast.error(err.message),
  });

  // Map the tRPC rule rows onto the UI's shape.
  const rules: RecurringRule[] = (rulesQuery.rules ?? []).map((r) => ({
    id: r.id,
    amount: Number(r.amount),
    description: r.description,
    type: r.type,
    frequency: r.frequency,
    interval: r.interval,
    startDate: r.startDate,
    nextRunDate: r.nextRunDate,
    endDate: r.endDate,
    status: r.status,
    lastRunAt: r.lastRunAt ? new Date(r.lastRunAt).toISOString() : null,
    accountId: r.accountId,
    toAccountId: r.destinationAccountId,
    categoryId: r.categoryId,
    currency: r.currency,
    merchantId: r.merchantId,
    amountMode: r.amountMode,
  }));

  const accountOptions = (accountsQuery.accounts ?? []).map((a) => ({
    id: a.id,
    name: a.name,
    color: a.color ?? "",
  }));

  // Summary stats
  const stats = useMemo(() => {
    const active = rules.filter((r) => r.status === "active");
    const paused = rules.filter((r) => r.status === "paused");

    const monthlyExpense = active
      .filter((r) => r.type === "expense")
      .reduce((sum, r) => {
        const monthly = r.frequency === "monthly" ? r.amount : r.frequency === "weekly" ? r.amount * 4.33 : r.frequency === "daily" ? r.amount * 30 : r.amount / 12;
        return sum + monthly;
      }, 0);

    const monthlyIncome = active
      .filter((r) => r.type === "income")
      .reduce((sum, r) => {
        const monthly = r.frequency === "monthly" ? r.amount : r.frequency === "weekly" ? r.amount * 4.33 : r.frequency === "daily" ? r.amount * 30 : r.amount / 12;
        return sum + monthly;
      }, 0);

    const pendingRows = (occurrencesQuery.occurrences ?? []).filter(
      (occ) => occ.status === "pending" || occ.status === "awaiting_confirmation",
    ).length;
    // Plus the scheduled dates that have no row yet, so the count matches what
    // the calendar actually shows as due.
    const upcomingThisMonth = pendingRows + (projectedQuery.projectedOccurrences ?? []).length;

    return { active, paused, monthlyExpense, monthlyIncome, upcomingThisMonth };
  }, [rules, occurrencesQuery.occurrences, projectedQuery.projectedOccurrences]);

  const handleSubmit = () => {
    if (!spaceId) {
      toast.error("No active space");
      return;
    }
    if (!form.description.trim() || !form.amount) {
      toast.error("Please fill in description and amount");
      return;
    }
    if (form.type === "transfer" && (!form.accountId || !form.toAccountId)) {
      toast.error("Transfers need both source and destination accounts");
      return;
    }

    const frequency = form.frequency as "daily" | "weekly" | "monthly" | "yearly";
    const interval = Math.max(1, Math.floor(Number(form.interval) || 1));

    createRule.createRuleAsync({
      spaceId,
      type: form.type,
      amount: Number(form.amount),
      description: form.description.trim(),
      schedule: {
        frequency,
        interval,
        dayOfWeek: null,
        dayOfMonth: null,
      },
      accountId: form.accountId === "" ? null : form.accountId,
      destinationAccountId:
        form.type === "transfer" && form.toAccountId !== ""
          ? form.toAccountId
          : null,
      categoryId: form.categoryId === "" ? null : form.categoryId,
      startDate: startDate ? startDate.toISOString().slice(0, 10) : null,
      endDate: endDate ? endDate.toISOString().slice(0, 10) : null,
      autoPost: form.accountId !== "",
    });
  };

  const handleTogglePause = (rule: RecurringRule) => {
    if (rule.status === "active") {
      pauseRule.updateRuleStatus({ ruleId: rule.id });
    } else {
      resumeRule.resumeRule({ ruleId: rule.id });
    }
  };

  const handleSelectOccurrence = (occ: OccurrenceListItem) => {
    setSelectedOccurrence(occ);
    setOccurrencePanelOpen(true);
  };

  const isLoading = rulesQuery.isPending;
  const isEmpty = !isLoading && rules.length === 0;

  return (
    <div className="space-y-5 p-4 md:p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Recurring</h1>
          <p className="text-[12px] text-muted-foreground mt-0.5">
            Automate your regular income and expenses
          </p>
        </div>
        <Button
          size="sm"
          className="h-8 gap-1.5 rounded-md"
          onClick={() => {
            setForm(EMPTY_FORM);
            setIsAddOpen(true);
          }}
        >
          <Plus className="h-3.5 w-3.5" />
          Add rule
        </Button>
      </div>

      {/* Summary Cards */}
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-7 w-7 rounded-md bg-emerald-500/10 flex items-center justify-center">
                  <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
                </div>
                <span className="text-[11px] text-muted-foreground font-medium">Monthly income</span>
              </div>
              <p className="text-lg font-bold tabular-nums text-emerald-600">
                {currency} {fmt(stats.monthlyIncome)}
              </p>
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-7 w-7 rounded-md bg-red-500/10 flex items-center justify-center">
                  <TrendingDown className="h-3.5 w-3.5 text-red-600" />
                </div>
                <span className="text-[11px] text-muted-foreground font-medium">Monthly expenses</span>
              </div>
              <p className="text-lg font-bold tabular-nums text-red-600">
                {currency} {fmt(stats.monthlyExpense)}
              </p>
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-7 w-7 rounded-md bg-primary/10 flex items-center justify-center">
                  <RepeatIcon className="h-3.5 w-3.5 text-primary" />
                </div>
                <span className="text-[11px] text-muted-foreground font-medium">Active rules</span>
              </div>
              <p className="text-lg font-bold tabular-nums">
                {stats.active.length}
                {stats.paused.length > 0 && (
                  <span className="text-xs font-normal text-muted-foreground ml-1">
                    + {stats.paused.length} paused
                  </span>
                )}
              </p>
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-7 w-7 rounded-md bg-amber-500/10 flex items-center justify-center">
                  <CalendarDays className="h-3.5 w-3.5 text-amber-600" />
                </div>
                <span className="text-[11px] text-muted-foreground font-medium">Due this month</span>
              </div>
              <p className="text-lg font-bold tabular-nums">
                {stats.upcomingThisMonth}
                <span className="text-xs font-normal text-muted-foreground ml-1">occurrences</span>
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="upcoming" className="gap-1.5">
            <CalendarDays className="h-3.5 w-3.5" />
            Upcoming
          </TabsTrigger>
          <TabsTrigger value="rules" className="gap-1.5">
            <List className="h-3.5 w-3.5" />
            All Rules
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="mt-4">
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-[400px] rounded-lg" />
              <Skeleton className="h-32 rounded-lg" />
            </div>
          ) : isEmpty ? (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <RepeatIcon />
                </EmptyMedia>
                <EmptyTitle>No recurring rules yet</EmptyTitle>
                <EmptyDescription>
                  Schedule rent, subscriptions and salaries — occurrences post
                  themselves when due.
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Button
                  className="rounded-xl"
                  onClick={() => {
                    setForm(EMPTY_FORM);
                    setIsAddOpen(true);
                  }}
                >
                  Add rule
                </Button>
              </EmptyContent>
            </Empty>
          ) : (
            <div className="space-y-6">
              <RecurringCalendar
                month={calendarMonth}
                onMonthChange={setCalendarMonth}
                occurrences={occurrencesQuery.occurrences ?? []}
                projected={projectedQuery.projectedOccurrences ?? []}
                isFetching={occurrencesQuery.isFetching || projectedQuery.isFetching}
                onSelectOccurrence={handleSelectOccurrence}
              />
              <OccurrenceList
                occurrences={occurrencesQuery.occurrences ?? []}
                onSelectOccurrence={handleSelectOccurrence}
              />
            </div>
          )}
        </TabsContent>

        <TabsContent value="rules" className="mt-4">
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
            </div>
          ) : isEmpty ? (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <RepeatIcon />
                </EmptyMedia>
                <EmptyTitle>No recurring rules yet</EmptyTitle>
                <EmptyDescription>
                  Create your first recurring rule to see it here.
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Button
                  className="rounded-xl"
                  onClick={() => {
                    setForm(EMPTY_FORM);
                    setIsAddOpen(true);
                  }}
                >
                  Add rule
                </Button>
              </EmptyContent>
            </Empty>
          ) : (
            <AllRulesTable rules={rules} accounts={accountOptions} />
          )}
        </TabsContent>
      </Tabs>

      {/* Form dialog */}
      <RecurringFormDialog
        open={isAddOpen}
        onOpenChange={setIsAddOpen}
        form={form}
        onFormChange={setForm}
        startDate={startDate}
        onStartDateChange={setStartDate}
        accounts={accountOptions}
        categories={categories.items.map((c) => ({ id: c.id, name: c.name }))}
        currency={currency}
        onSubmit={handleSubmit}
        onCancel={() => setIsAddOpen(false)}
      />

      {/* Occurrence detail panel */}
      <OccurrenceDetailPanel
        occurrence={selectedOccurrence}
        open={occurrencePanelOpen}
        onOpenChange={setOccurrencePanelOpen}
      />
    </div>
  );
}
