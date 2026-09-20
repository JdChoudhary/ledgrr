"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { RepeatIcon } from "lucide-react";
import { useSpaces } from "~/hooks/api/space";
import { useAccounts } from "~/hooks/api/account";
import { useCategoryOptions } from "~/hooks/api/category/hierarchy";
import {
  useCancelRecurringRule,
  useCreateRecurringRule,
  useRecurringRules,
  useResumeRecurringRule,
  useUpdateRecurringRuleStatus,
} from "~/hooks/api/recurring";
import { RecurringHeader } from "./recurring-header";
import { RecurringRuleList } from "./recurring-rule-list";
import { RecurringFormDialog } from "./recurring-rule-form-dialog";
import type { RecurringRule } from "../lib/types";

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
 */
export function RecurringPage() {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [startDate, setStartDate] = useState<Date | undefined>(new Date());
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);

  const spaces = useSpaces({});
  const space = spaces.spaces?.[0]?.space;
  const spaceId = space?.id;
  const currency = space?.baseCurrency ?? "USD";

  const rulesQuery = useRecurringRules(spaceId ? { spaceId } : undefined);
  const accountsQuery = useAccounts(
    spaceId ? { spaceId, includeArchived: false } : undefined,
  );
  const categories = useCategoryOptions(spaceId ? { spaceId } : undefined);

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
  }));

  const accountOptions = (accountsQuery.accounts ?? []).map((a) => ({
    id: a.id,
    name: a.name,
    color: a.color ?? "",
  }));

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
        // The standalone rule form keeps the simple schedule; day-of picks
        // live in the add-transaction flow.
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

  const activeRules = rules.filter((r) => r.status === "active");
  const pausedRules = rules.filter((r) => r.status === "paused");
  const otherRules = rules.filter(
    (r) => r.status !== "active" && r.status !== "paused",
  );

  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      {rulesQuery.isPending ? (
        <div className="space-y-2">
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
        </div>
      ) : rules.length === 0 ? (
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
        <RecurringRuleList
          activeRules={activeRules}
          pausedRules={pausedRules}
          otherRules={otherRules}
          fmt={fmt}
          onTogglePause={handleTogglePause}
          onCancel={(id) => cancelRule.cancelRule({ ruleId: id })}
          onAddRule={() => {
            setForm(EMPTY_FORM);
            setIsAddOpen(true);
          }}
        />
      )}

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
    </div>
  );
}
