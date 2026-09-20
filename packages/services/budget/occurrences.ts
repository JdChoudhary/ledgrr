import { and, db, eq, gte, isNull, lt, lte, sql } from "@repo/database";
import {
  budgetPeriods,
  budgets,
  transactions,
  type SelectBudget,
  type SelectBudgetPeriod,
} from "@repo/database/schema";
import { ServiceError } from "../lib/errors";
import { parseInput } from "../lib/schema";
import { assertActiveSpaceMember } from "../space";
import { budgetLookupSchema, type BudgetLookupInput } from "./model";
import {
  boundsFor,
  listPeriodBounds,
  nextPeriodStart,
  type BudgetRule,
} from "./periods";

/**
 * Occurrence lifecycle for budget rules.
 *
 *   budgets        = the definition / rule ("monthly from 2026-01-15, 500, rollover")
 *   budget_periods = historical/current occurrences of that rule
 *
 * Occurrences are materialized lazily: reading a budget's status or periods
 * creates any missing rows up to today, and closes past periods by computing
 * `actual_spend` from posted transactions and carrying rollover into the next
 * occurrence. The rule itself is never mutated by this module.
 */

const DAY_MS = 86_400_000;

const todayUtc = (): string => new Date().toISOString().slice(0, 10);

const toRule = (budget: SelectBudget): BudgetRule => ({
  periodType: budget.periodType,
  startsOn: budget.startsOn,
  endsOn: budget.endsOn,
});

const money = (value: number): string => value.toFixed(4);

// ---------------------------------------------------------------------------
// Scope matching
// ---------------------------------------------------------------------------

/**
 * Posted, non-deleted rows count toward budgets. Every budget targets exactly
 * one category — the budget's categoryId is the spend scope. `expense` adds
 * spend; `refund` subtracts from it. Amounts are base-currency so
 * multi-currency spaces aggregate correctly.
 */
const spendCondition = (budget: SelectBudget) =>
  eq(transactions.categoryId, budget.categoryId);

/** Net spend (expense - refund) for an occurrence, in base currency. */
const computeSpend = async (
  budget: SelectBudget,
  periodStart: string,
  periodEnd: string,
): Promise<number> => {
  const [row] = await db
    .select({
      expense: sql<string>`COALESCE(SUM(CASE WHEN ${transactions.type} = 'expense' THEN ${transactions.amountInBaseCurrency} ELSE 0 END), 0)`,
      refund: sql<string>`COALESCE(SUM(CASE WHEN ${transactions.type} = 'refund' THEN ${transactions.amountInBaseCurrency} ELSE 0 END), 0)`,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.spaceId, budget.spaceId),
        eq(transactions.status, "posted"),
        isNull(transactions.deletedAt),
        gte(transactions.date, periodStart),
        lte(transactions.date, periodEnd),
        spendCondition(budget),
      ),
    );

  // actual_spend carries a non-negative CHECK; refunds beyond expenses clamp to 0.
  return Math.max(0, Number(row?.expense ?? 0) - Number(row?.refund ?? 0));
};

// ---------------------------------------------------------------------------
// Materialization
// ---------------------------------------------------------------------------

/**
 * Creates the opening occurrence of a budget rule — the one containing
 * `startsOn`, clamped by the rule's end date. Called at creation time so a
 * new budget always has its first period, even when start-dated in the
 * future (later occurrences are materialized lazily as time passes).
 */
export async function createFirstBudgetPeriod(budget: SelectBudget): Promise<void> {
  const first = boundsFor(toRule(budget), budget.startsOn);
  if (!first) {
    return;
  }

  await db
    .insert(budgetPeriods)
    .values({
      budgetId: budget.id,
      spaceId: budget.spaceId,
      periodStart: first.periodStart,
      periodEnd: first.periodEnd,
      limitAmount: budget.limitAmount,
      rolloverIn: "0",
    })
    .onConflictDoNothing({
      target: [budgetPeriods.budgetId, budgetPeriods.periodStart],
    });
}

/** Creates any occurrence rows missing between the rule start and today. */
export async function ensureBudgetPeriods(budget: SelectBudget): Promise<void> {
  const bounds = listPeriodBounds(toRule(budget), todayUtc());

  if (bounds.length === 0) {
    return;
  }

  await db
    .insert(budgetPeriods)
    .values(
      bounds.map((bound) => ({
        budgetId: budget.id,
        spaceId: budget.spaceId,
        periodStart: bound.periodStart,
        periodEnd: bound.periodEnd,
        limitAmount: budget.limitAmount,
        rolloverIn: "0",
      })),
    )
    .onConflictDoNothing({
      target: [budgetPeriods.budgetId, budgetPeriods.periodStart],
    });
}

/**
 * Closes every past-due open occurrence: stores `actual_spend`, stamps
 * `closed_at`, and carries rollover into the next occurrence (clamped to 0 —
 * overspend does not create negative rollover).
 */
export async function closeDueBudgetPeriods(budget: SelectBudget): Promise<void> {
  const today = todayUtc();
  const rule = toRule(budget);

  const due = await db
    .select()
    .from(budgetPeriods)
    .where(
      and(
        eq(budgetPeriods.budgetId, budget.id),
        isNull(budgetPeriods.closedAt),
        // Only periods that have fully elapsed.
        lt(budgetPeriods.periodEnd, today),
      ),
    )
    .orderBy(budgetPeriods.periodStart);

  for (const period of due) {
    const spend = await computeSpend(budget, period.periodStart, period.periodEnd);
    const unused = Number(period.limitAmount) + Number(period.rolloverIn) - spend;
    const rollover = budget.rollover ? Math.max(0, unused) : 0;

    await db.transaction(async (tx) => {
      await tx
        .update(budgetPeriods)
        .set({ actualSpend: money(spend), closedAt: new Date() })
        .where(eq(budgetPeriods.id, period.id));

      const nextStart = nextPeriodStart(rule, period.periodEnd);

      if (nextStart) {
        await tx
          .update(budgetPeriods)
          .set({ rolloverIn: money(rollover) })
          .where(
            and(
              eq(budgetPeriods.budgetId, budget.id),
              eq(budgetPeriods.periodStart, nextStart),
              isNull(budgetPeriods.closedAt),
            ),
          );
      }
    });
  }
}

// ---------------------------------------------------------------------------
// Live status
// ---------------------------------------------------------------------------

export type BudgetStatus = {
  budgetId: string;
  /** The occurrence containing today (null before the rule starts / after it ends). */
  period: {
    periodStart: string;
    periodEnd: string;
    limitAmount: string;
    rolloverIn: string;
  } | null;
  /** Live spend for the current occurrence, in base currency (not stored). */
  liveSpend: string;
  /** limit + rollover - live spend; can go negative when overspent. */
  remaining: string;
  percentUsed: number;
  /** `over` at >=100%, `warning` at >= alertThresholdPercent, else on_track. */
  state: "on_track" | "warning" | "over";
};

/** Ensures occurrences exist and are closed, then reports the live status. */
export async function getBudgetStatus(input: BudgetLookupInput): Promise<BudgetStatus> {
  const { spaceId, actorUserId, budgetId } = parseInput(
    budgetLookupSchema,
    input,
    "getBudgetStatus input",
  );

  await assertActiveSpaceMember({ spaceId, userId: actorUserId });

  const [budget] = await db
    .select()
    .from(budgets)
    .where(and(eq(budgets.id, budgetId), eq(budgets.spaceId, spaceId)))
    .limit(1);

  if (!budget) {
    throw new ServiceError("NOT_FOUND", "Budget not found in this space");
  }

  await ensureBudgetPeriods(budget);
  await closeDueBudgetPeriods(budget);

  const today = todayUtc();
  const currentBounds = boundsFor(toRule(budget), today);

  if (!currentBounds) {
    return {
      budgetId: budget.id,
      period: null,
      liveSpend: money(0),
      remaining: money(0),
      percentUsed: 0,
      state: "on_track",
    };
  }

  const [period] = await db
    .select()
    .from(budgetPeriods)
    .where(
      and(
        eq(budgetPeriods.budgetId, budget.id),
        eq(budgetPeriods.periodStart, currentBounds.periodStart),
      ),
    )
    .limit(1);

  const liveSpend = await computeSpend(
    budget,
    currentBounds.periodStart,
    currentBounds.periodEnd,
  );

  const effectiveLimit =
    Number(budget.limitAmount) + Number(period?.rolloverIn ?? 0);
  const remaining = effectiveLimit - liveSpend;
  const percentUsed =
    effectiveLimit > 0 ? Math.round((liveSpend / effectiveLimit) * 100) : 0;

  const state: BudgetStatus["state"] =
    percentUsed >= 100
      ? "over"
      : budget.alertThresholdPercent !== null &&
          percentUsed >= budget.alertThresholdPercent
        ? "warning"
        : "on_track";

  return {
    budgetId: budget.id,
    period: {
      periodStart: currentBounds.periodStart,
      periodEnd: currentBounds.periodEnd,
      limitAmount: budget.limitAmount,
      rolloverIn: period?.rolloverIn ?? "0",
    },
    liveSpend: money(liveSpend),
    remaining: money(remaining),
    percentUsed,
    state,
  };
}

/** Materializes + closes, then returns every occurrence of a budget rule. */
export async function listBudgetOccurrences(
  budget: SelectBudget,
): Promise<ReadonlyArray<SelectBudgetPeriod>> {
  await ensureBudgetPeriods(budget);
  await closeDueBudgetPeriods(budget);

  return db
    .select()
    .from(budgetPeriods)
    .where(eq(budgetPeriods.budgetId, budget.id))
    .orderBy(budgetPeriods.periodStart);
}
