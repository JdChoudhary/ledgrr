import { and, asc, db, eq, gte, lte, sql } from "@repo/database";
import {
  recurringRuleOccurrences,
  recurringRules,
  type SelectRecurringRule,
  userSettings,
} from "@repo/database/schema";
import {
  ServiceError,
  isCheckViolation,
  isForeignKeyViolation,
  isUniqueViolation,
} from "../lib/errors";
import { parseInput } from "../lib/schema";
import { createTransaction, type TransactionListItem } from "../transaction";
import {
  computeNextRunDate,
  type RecurringFrequency,
} from "./schedule";
import {
  createRuleInputSchema,
  listRulesInputSchema,
  listOccurrencesInputSchema,
  confirmOccurrenceInputSchema,
  skipOccurrenceInputSchema,
  ruleLookupSchema,
  updateRuleStatusSchema,
  type CreateRuleInput,
  type ListRulesInput,
  type ListOccurrencesInput,
  type ConfirmOccurrenceInput,
  type SkipOccurrenceInput,
  type RecurringRuleListItem,
  type RuleLog,
  type RuleSplitConfig,
  type RuleSplitConfigNormalized,
  type OccurrenceListItem,
  type ProjectedOccurrence,
} from "./model";

/**
 * Recurring service — schedule ownership + lazy catch-up execution.
 *
 * A rule is a template (type + amount + schedule). Occurrences produce normal
 * transactions through the transaction service, plus one log row per
 * scheduled date (`recurring_rule_logs` is unique per rule+date, so catch-up
 * is idempotent — safe to run on every app load).
 *
 * Execution model (per grilling-session Q11: lazy catch-up now, scheduler
 * later — both call `runDueRules`):
 *   - `autoPost: true`  -> occurrences post automatically when due
 *   - `autoPost: false` -> occurrences create only a "skipped" log row and
 *                          the rule keeps advancing; UI can remind
 */

/**
 * Normalize the stored split config (optional fields, possibly-null share
 * values) into the stable client shape (every field explicitly null).
 */
const toSplitConfigNormalized = (
  raw: RuleSplitConfig | null,
): RuleSplitConfigNormalized | null => {
  if (raw == null) return null;
  return {
    title: raw.title,
    participants: raw.participants.map((p) => ({
      userId: p.userId ?? null,
      contactId: p.contactId ?? null,
      name: p.name ?? null,
      shareType: p.shareType,
      shareValue: p.shareValue ?? null,
    })),
  };
};

const toRuleListItem = (row: SelectRecurringRule): RecurringRuleListItem => ({
  id: row.id,
  userId: row.userId,
  createdBy: row.createdBy,
  accountId: row.accountId,
  destinationAccountId: row.destinationAccountId,
  categoryId: row.categoryId,
  merchantId: row.merchantId,
  type: row.type === "split_expense" ? "expense" : row.type,
  amountMode: row.amountMode,
  amount: row.amount,
  currency: row.currency,
  description: row.description ?? "",
  frequency: row.frequency,
  interval: row.interval,
  dayOfWeek: row.dayOfWeek,
  dayOfMonth: row.dayOfMonth,
  autoPost: row.autoPost,
  remindDaysBefore: row.remindDaysBefore,
  splitConfig: toSplitConfigNormalized(
    (row.splitConfig as RuleSplitConfig | null) ?? null,
  ),
  startDate: row.startDate,
  nextRunDate: row.nextRunDate,
  endDate: row.endDate,
  status: row.status,
  lastRunAt: row.lastRunAt,
});

// ---------------------------------------------------------------------------
// Create
// ---------------------------------------------------------------------------

export async function createRule(input: CreateRuleInput): Promise<RecurringRuleListItem> {
  const parsed = parseInput(createRuleInputSchema, input, "createRule input");
  const {
    actorUserId,
    type,
    amount,
    description,
    schedule,
    accountId,
    destinationAccountId,
    categoryId,
    merchantId,
    currency,
    startDate,
    endDate,
    autoPost,
    remindDaysBefore,
    splitConfig,
  } = parsed;


  // A recurring split is an expense split across participants on every
  // occurrence; other types have nothing to allocate.
  if (splitConfig != null && type !== "expense") {
    throw new ServiceError(
      "VALIDATION_ERROR",
      "A recurring split requires the expense type",
    );
  }
  if (splitConfig != null && !(autoPost ?? false)) {
    throw new ServiceError(
      "VALIDATION_ERROR",
      "A recurring split needs auto-post on — reminders alone can't create the participants' debts",
    );
  }

  // Currency defaults to the user's base currency (rate = 1 world).
  let effectiveCurrency = currency;
  if (effectiveCurrency == null) {
    const [settings] = await db
      .select({ displayCurrency: userSettings.displayCurrency })
      .from(userSettings)
      .where(eq(userSettings.userId, actorUserId))
      .limit(1);
    effectiveCurrency = settings?.displayCurrency ?? "USD";
  }

  const willAutoPost = autoPost ?? false;
  if (willAutoPost && accountId == null) {
    throw new ServiceError(
      "VALIDATION_ERROR",
      "Auto-post requires an account — pick an account or turn auto-post off",
    );
  }

  const start = startDate ?? new Date().toISOString().slice(0, 10);
  if (endDate != null && endDate < start) {
    throw new ServiceError("VALIDATION_ERROR", "End date must be on or after the start date");
  }

  // The first occurrence is the start date itself; the next run is computed
  // from it. (The start occurrence is NOT auto-created — the caller's
  // transaction flow records the first transaction explicitly.)
  const nextRun = computeNextRunDate({
    frequency: schedule.frequency,
    interval: schedule.interval,
    dayOfWeek: schedule.dayOfWeek ?? null,
    dayOfMonth: schedule.dayOfMonth ?? null,
    fromDate: start,
    inclusive: false,
  });

  try {
    // The DB CHECK requires split_config only when type = 'split_expense'.
    // The API accepts type='expense' + splitConfig (UI convention); store the
    // canonical split_expense type and map back to 'expense' when posting.
    const storedType = splitConfig != null ? "split_expense" : type;
    const [row] = await db
      .insert(recurringRules)
      .values({
        userId: actorUserId,
        createdBy: actorUserId,
        accountId: accountId ?? null,
        destinationAccountId: destinationAccountId ?? null,
        categoryId: categoryId ?? null,
        merchantId: merchantId ?? null,
        type: storedType,
        amount,
        currency: effectiveCurrency,
        description,
        frequency: schedule.frequency,
        interval: schedule.interval,
        dayOfWeek: schedule.dayOfWeek ?? null,
        dayOfMonth: schedule.dayOfMonth ?? null,
        autoPost: willAutoPost,
        remindDaysBefore: remindDaysBefore ?? null,
        splitConfig: splitConfig ?? null,
        version: 1,
        startDate: start,
        nextRunDate: nextRun,
        endDate: endDate ?? null,
        status: "active",
        notes: null,
      })
      .returning();

    if (!row) {
      throw new ServiceError("INVALID_STATE", "Failed to create recurring rule");
    }
    return toRuleListItem(row);
  } catch (error) {
    if (isForeignKeyViolation(error)) {
      throw new ServiceError("VALIDATION_ERROR", "Invalid account or category reference");
    }
    if (isCheckViolation(error)) {
      throw new ServiceError("VALIDATION_ERROR", "Recurring rule violates a schedule constraint");
    }
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Read
// ---------------------------------------------------------------------------

export async function listRules(
  input: ListRulesInput,
): Promise<RecurringRuleListItem[]> {
  const parsed = parseInput(listRulesInputSchema, input, "listRules input");
  const { actorUserId, status } = parsed;

  const conditions = [eq(recurringRules.userId, actorUserId)];
  if (status != null) {
    conditions.push(eq(recurringRules.status, status));
  }

  const rows = await db
    .select()
    .from(recurringRules)
    .where(and(...conditions))
    .orderBy(asc(recurringRules.nextRunDate));

  return rows.map(toRuleListItem);
}

// ---------------------------------------------------------------------------
// Status transitions
// ---------------------------------------------------------------------------

async function loadRuleForActor(ruleId: string, actorUserId: string) {
  const [row] = await db
    .select()
    .from(recurringRules)
    .where(eq(recurringRules.id, ruleId))
    .limit(1);
  if (!row) {
    throw new ServiceError("NOT_FOUND", "Recurring rule not found");
  }
  if (row.createdBy !== actorUserId) {
    throw new ServiceError("FORBIDDEN", "Only the rule creator can manage this rule");
  }
  return row;
}

export async function updateRuleStatus(
  input: unknown,
): Promise<RecurringRuleListItem> {
  const parsed = parseInput(updateRuleStatusSchema, input, "updateRuleStatus input");
  const { ruleId, actorUserId, status } = parsed;

  const row = await loadRuleForActor(ruleId, actorUserId);
  if (row.status === "cancelled") {
    throw new ServiceError("INVALID_STATE", "A cancelled rule cannot be reactivated");
  }
  if (row.status === "completed") {
    throw new ServiceError("INVALID_STATE", "A completed rule cannot be reactivated");
  }

  const [updated] = await db
    .update(recurringRules)
    .set({ status })
    .where(eq(recurringRules.id, ruleId))
    .returning();

  if (!updated) {
    throw new ServiceError("INVALID_STATE", "Failed to update recurring rule");
  }
  return toRuleListItem(updated);
}

// ---------------------------------------------------------------------------
// Logs
// ---------------------------------------------------------------------------

export async function listRuleLogs(ruleId: string): Promise<RuleLog[]> {
  const rows = await db
    .select()
    .from(recurringRuleOccurrences)
    .where(eq(recurringRuleOccurrences.ruleId, ruleId))
    .orderBy(asc(recurringRuleOccurrences.scheduledFor));

  return rows
    .filter(
      (row): row is typeof row & { status: "success" | "skipped" | "failed" } =>
        row.status === "success" ||
        row.status === "skipped" ||
        row.status === "failed",
    )
    .map((row) => ({
      id: row.id,
      ruleId: row.ruleId,
      transactionId: row.transactionId,
      scheduledFor: row.scheduledFor,
      status: row.status,
      errorMessage: row.errorMessage,
    }));
}

// ---------------------------------------------------------------------------
// Lazy catch-up execution
// ---------------------------------------------------------------------------

/**
 * Post (or log) every occurrence that has come due for the user's
 * active auto-post rules. Idempotent: `recurring_rule_logs` has a unique
 * (ruleId, scheduledFor) index, so a re-run never double-posts.
 *
 * Called from the tRPC recurring router (`catchUp`) and safe to call on every
 * app load; a background scheduler can call the same function later.
 */
export async function runDueRules(input: {
  actorUserId: string;
}): Promise<{ posted: number; logged: number; failed: number }> {
  const { actorUserId } = input;

  const today = new Date().toISOString().slice(0, 10);

  const due = await db
    .select()
    .from(recurringRules)
    .where(
      and(
        eq(recurringRules.userId, actorUserId),
        eq(recurringRules.status, "active"),
        eq(recurringRules.autoPost, true),
        lte(recurringRules.nextRunDate, today),
      ),
    );

  let posted = 0;
  let logged = 0;
  let failed = 0;

  for (const rule of due) {
    // Advance one occurrence at a time so a rule that was offline for months
    // catches up date by date, each with its own log row.
    let guard = 0;
    while (rule.nextRunDate <= today && guard < 100) {
      guard += 1;
      const scheduledFor = rule.nextRunDate;

      // 1. Occurrence row first (unique per rule+date) — makes the run
      // idempotent.
      const inserted = await db
        .insert(recurringRuleOccurrences)
        .values({
          ruleId: rule.id,
          userId: actorUserId,
          ruleVersion: rule.version,
          transactionId: null,
          scheduledFor,
          status: "skipped",
          skippedReason: "auto-post pending",
        })
        .onConflictDoNothing()
        .returning();

      if (inserted.length === 0) {
        // Someone already processed this occurrence (concurrent tab/re-run).
        rule.nextRunDate = computeNextRunDate({
          frequency: rule.frequency as RecurringFrequency,
          interval: rule.interval,
          dayOfWeek: rule.dayOfWeek,
          dayOfMonth: rule.dayOfMonth,
          fromDate: scheduledFor,
          inclusive: false,
        });
        continue;
      }

      try {
        const transaction: TransactionListItem = await createTransaction({
          actorUserId: rule.createdBy,
          type: rule.type === "split_expense" ? "expense" : rule.type,
          amount: Number(rule.amount),
          date: scheduledFor,
          accountId: rule.accountId,
          destinationAccountId: rule.destinationAccountId,
          categoryId: rule.categoryId,
          merchantId: rule.merchantId,
          currency: rule.currency,
          description: rule.description,
          notes: null,
          recurringRuleId: rule.id,
          billSplit:
            (rule.splitConfig as RuleSplitConfig | null) != null
              ? {
                  title: (rule.splitConfig as RuleSplitConfig).title,
                  participants: (rule.splitConfig as RuleSplitConfig).participants,
                }
              : null,
        });

        await db
          .update(recurringRuleOccurrences)
          .set({
            status: "success",
            transactionId: transaction.id,
            executedAt: new Date(),
          })
          .where(
            and(
              eq(recurringRuleOccurrences.ruleId, rule.id),
              eq(recurringRuleOccurrences.scheduledFor, scheduledFor),
            ),
          );
        posted += 1;
      } catch (error) {
        failed += 1;
        await db
          .update(recurringRuleOccurrences)
          .set({
            status: "failed",
            errorMessage: error instanceof Error ? error.message : "Unknown error",
            attemptCount: sql`${recurringRuleOccurrences.attemptCount} + 1`,
            lastAttemptAt: new Date(),
            executedAt: new Date(),
          })
          .where(
            and(
              eq(recurringRuleOccurrences.ruleId, rule.id),
              eq(recurringRuleOccurrences.scheduledFor, scheduledFor),
            ),
          );
      }

      // 2. Advance the rule; complete it when past its end date.
      const nextRun = computeNextRunDate({
        frequency: rule.frequency as RecurringFrequency,
        interval: rule.interval,
        dayOfWeek: rule.dayOfWeek,
        dayOfMonth: rule.dayOfMonth,
        fromDate: scheduledFor,
        inclusive: false,
      });

      const completed = rule.endDate != null && nextRun > rule.endDate;
      await db
        .update(recurringRules)
        .set({
          nextRunDate: nextRun,
          lastRunAt: new Date(),
          status: completed ? "completed" : rule.status,
        })
        .where(eq(recurringRules.id, rule.id));

      rule.nextRunDate = nextRun;
      if (completed) break;
    }
  }

  return { posted, logged, failed };
}

// ---------------------------------------------------------------------------
// Occurrences (calendar view)
// ---------------------------------------------------------------------------

export async function listOccurrences(
  input: ListOccurrencesInput,
): Promise<OccurrenceListItem[]> {
  const parsed = parseInput(listOccurrencesInputSchema, input, "listOccurrences input");
  const { actorUserId, month } = parsed;

  // Get the first and last day of the month
  const [year, mon] = month.split("-").map(Number);
  const fromDate = `${year}-${String(mon).padStart(2, "0")}-01`;
  const lastDay = new Date(Number(year), Number(mon), 0).getDate();
  const toDate = `${year}-${String(mon).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

  // Fetch occurrences for this month
  const rows = await db
    .select({
      id: recurringRuleOccurrences.id,
      ruleId: recurringRuleOccurrences.ruleId,
      transactionId: recurringRuleOccurrences.transactionId,
      scheduledFor: recurringRuleOccurrences.scheduledFor,
      status: recurringRuleOccurrences.status,
      // Rule fields
      ruleDescription: recurringRules.description,
      ruleAmount: recurringRules.amount,
      ruleCurrency: recurringRules.currency,
      ruleType: recurringRules.type,
      ruleAmountMode: recurringRules.amountMode,
      ruleAccountId: recurringRules.accountId,
      ruleCategoryId: recurringRules.categoryId,
      ruleMerchantId: recurringRules.merchantId,
      ruleFrequency: recurringRules.frequency,
      ruleInterval: recurringRules.interval,
    })
    .from(recurringRuleOccurrences)
    .innerJoin(recurringRules, eq(recurringRuleOccurrences.ruleId, recurringRules.id))
    .where(
      and(
        eq(recurringRuleOccurrences.userId, actorUserId),
        gte(recurringRuleOccurrences.scheduledFor, fromDate),
        lte(recurringRuleOccurrences.scheduledFor, toDate),
      ),
    )
    .orderBy(asc(recurringRuleOccurrences.scheduledFor));

  return rows.map((row) => ({
    id: row.id,
    ruleId: row.ruleId,
    transactionId: row.transactionId,
    scheduledFor: row.scheduledFor,
    status: row.status as OccurrenceListItem["status"],
    ruleDescription: row.ruleDescription ?? "",
    ruleAmount: row.ruleAmount,
    ruleCurrency: row.ruleCurrency,
    ruleType: row.ruleType === "split_expense" ? "expense" : row.ruleType,
    ruleAmountMode: row.ruleAmountMode,
    ruleAccountId: row.ruleAccountId,
    ruleCategoryId: row.ruleCategoryId,
    ruleMerchantId: row.ruleMerchantId,
    ruleFrequency: row.ruleFrequency,
    ruleInterval: row.ruleInterval,
  }));
}

// ---------------------------------------------------------------------------
// Schedule projection (dates a rule WILL fall on, for the calendar)
//
// Occurrence rows only exist once a rule has already come due, so a calendar
// built from them alone is empty for future months and for rules that do not
// auto-post. This projects each active rule's schedule instead — the same
// `computeNextRunDate` walk the runner uses — bounded by the rule's start and
// end dates, so a rule that stops in a given month simply stops appearing.
// ---------------------------------------------------------------------------

const pad2 = (value: number): string => String(value).padStart(2, "0");

/** Whole days from `a` to `b` (both YYYY-MM-DD). */
const daysBetween = (a: string, b: string): number =>
  Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);

const shiftIso = (date: string, days: number): string => {
  const shifted = new Date(`${date}T00:00:00Z`);
  shifted.setUTCDate(shifted.getUTCDate() + days);
  return shifted.toISOString().slice(0, 10);
};

/**
 * A date at or before `from` that stays phase-aligned with the schedule, so a
 * long-running daily/weekly rule costs a couple of steps instead of one per
 * elapsed day. Monthly and yearly rules already step by month/year.
 */
const projectionAnchor = (
  rule: { frequency: string; interval: number; startDate: string },
  from: string,
): string => {
  const days = daysBetween(rule.startDate, from);
  if (days <= 0) return rule.startDate;
  const step = Math.max(1, rule.interval);
  if (rule.frequency === "daily") {
    return shiftIso(rule.startDate, Math.floor(days / step) * step);
  }
  if (rule.frequency === "weekly") {
    return shiftIso(rule.startDate, Math.floor(days / (7 * step)) * 7 * step);
  }
  return rule.startDate;
};

export async function listProjectedOccurrences(
  input: ListOccurrencesInput,
): Promise<ProjectedOccurrence[]> {
  const { actorUserId, month } = parseInput(
    listOccurrencesInputSchema,
    input,
    "listProjectedOccurrences input",
  );

  const [yearPart, monthPart] = month.split("-").map(Number);
  const year = yearPart ?? new Date().getUTCFullYear();
  const mon = monthPart ?? 1;
  const monthStart = `${year}-${pad2(mon)}-01`;
  const lastDay = new Date(Date.UTC(year, mon, 0)).getUTCDate();
  const monthEnd = `${year}-${pad2(mon)}-${pad2(lastDay)}`;

  const rules = await db
    .select({
      id: recurringRules.id,
      description: recurringRules.description,
      amount: recurringRules.amount,
      currency: recurringRules.currency,
      type: recurringRules.type,
      amountMode: recurringRules.amountMode,
      accountId: recurringRules.accountId,
      categoryId: recurringRules.categoryId,
      merchantId: recurringRules.merchantId,
      frequency: recurringRules.frequency,
      interval: recurringRules.interval,
      dayOfWeek: recurringRules.dayOfWeek,
      dayOfMonth: recurringRules.dayOfMonth,
      startDate: recurringRules.startDate,
      endDate: recurringRules.endDate,
    })
    .from(recurringRules)
    .where(and(eq(recurringRules.userId, actorUserId), eq(recurringRules.status, "active")));

  const events: ProjectedOccurrence[] = [];

  for (const rule of rules) {
    // A rule that has not started yet, or that ended before this month, has no
    // dates in it — that is what makes a schedule stop in a given month.
    if (rule.startDate > monthEnd) continue;
    const lastDate = rule.endDate && rule.endDate < monthEnd ? rule.endDate : monthEnd;
    if (lastDate < monthStart) continue;

    let cursor = projectionAnchor(rule, monthStart);
    if (cursor < rule.startDate) cursor = rule.startDate;

    let guard = 0;
    while (cursor <= lastDate && guard < 500) {
      guard += 1;
      if (cursor >= monthStart && cursor >= rule.startDate) {
        events.push({
          id: `projected:${rule.id}:${cursor}`,
          ruleId: rule.id,
          scheduledFor: cursor,
          ruleDescription: rule.description ?? "",
          ruleAmount: rule.amount,
          ruleCurrency: rule.currency,
          ruleType: rule.type === "split_expense" ? "expense" : (rule.type as ProjectedOccurrence["ruleType"]),
          ruleAmountMode: rule.amountMode,
          ruleAccountId: rule.accountId,
          ruleCategoryId: rule.categoryId,
          ruleMerchantId: rule.merchantId,
          ruleFrequency: rule.frequency,
          ruleInterval: rule.interval,
        });
      }

      const next = computeNextRunDate({
        frequency: rule.frequency as RecurringFrequency,
        interval: rule.interval,
        dayOfWeek: rule.dayOfWeek,
        dayOfMonth: rule.dayOfMonth,
        fromDate: cursor,
        inclusive: false,
      });
      // A malformed schedule must never spin here.
      if (next <= cursor) break;
      cursor = next;
    }
  }

  events.sort((a, b) => a.scheduledFor.localeCompare(b.scheduledFor));
  return events;
}

export async function confirmOccurrence(
  input: ConfirmOccurrenceInput,
): Promise<{ id: string; transactionId: string }> {
  const parsed = parseInput(confirmOccurrenceInputSchema, input, "confirmOccurrence input");
  const { actorUserId, occurrenceId, amount } = parsed;

  // Load the occurrence
  const [occurrence] = await db
    .select()
    .from(recurringRuleOccurrences)
    .where(eq(recurringRuleOccurrences.id, occurrenceId))
    .limit(1);

  if (!occurrence) {
    throw new ServiceError("NOT_FOUND", "Occurrence not found");
  }
  if (occurrence.userId !== actorUserId) {
    throw new ServiceError("FORBIDDEN", "Occurrence does not belong to this user");
  }
  if (occurrence.status !== "awaiting_confirmation" && occurrence.status !== "pending") {
    throw new ServiceError("INVALID_STATE", `Cannot confirm an occurrence with status: ${occurrence.status}`);
  }

  // Load the rule
  const [rule] = await db
    .select()
    .from(recurringRules)
    .where(eq(recurringRules.id, occurrence.ruleId))
    .limit(1);

  if (!rule) {
    throw new ServiceError("NOT_FOUND", "Recurring rule not found");
  }

  // Create the transaction
  const transaction: TransactionListItem = await createTransaction({
    actorUserId: rule.createdBy,
    type: rule.type === "split_expense" ? "expense" : rule.type,
    amount: Number(amount),
    date: occurrence.scheduledFor,
    accountId: rule.accountId,
    destinationAccountId: rule.destinationAccountId,
    categoryId: rule.categoryId,
    merchantId: rule.merchantId,
    currency: rule.currency,
    description: rule.description,
    notes: null,
    recurringRuleId: rule.id,
    billSplit:
      (rule.splitConfig as RuleSplitConfig | null) != null
        ? {
            title: (rule.splitConfig as RuleSplitConfig).title,
            participants: (rule.splitConfig as RuleSplitConfig).participants,
          }
        : null,
  });

  // Update the occurrence
  await db
    .update(recurringRuleOccurrences)
    .set({
      status: "success",
      transactionId: transaction.id,
      executedAt: new Date(),
    })
    .where(eq(recurringRuleOccurrences.id, occurrenceId));

  return { id: occurrenceId, transactionId: transaction.id };
}

export async function skipOccurrence(
  input: SkipOccurrenceInput,
): Promise<{ id: string }> {
  const parsed = parseInput(skipOccurrenceInputSchema, input, "skipOccurrence input");
  const { actorUserId, occurrenceId, reason } = parsed;

  const [occurrence] = await db
    .select()
    .from(recurringRuleOccurrences)
    .where(eq(recurringRuleOccurrences.id, occurrenceId))
    .limit(1);

  if (!occurrence) {
    throw new ServiceError("NOT_FOUND", "Occurrence not found");
  }
  if (occurrence.userId !== actorUserId) {
    throw new ServiceError("FORBIDDEN", "Occurrence does not belong to this user");
  }
  if (occurrence.status === "success" || occurrence.status === "skipped") {
    throw new ServiceError("INVALID_STATE", `Cannot skip an occurrence with status: ${occurrence.status}`);
  }

  await db
    .update(recurringRuleOccurrences)
    .set({
      status: "skipped",
      skippedReason: reason ?? "Skipped by user",
    })
    .where(eq(recurringRuleOccurrences.id, occurrenceId));

  return { id: occurrenceId };
}


