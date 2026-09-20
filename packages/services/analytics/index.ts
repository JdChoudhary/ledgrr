import { and, db, eq, gte, isNull, lte, or, sql } from "@repo/database";
import {
  analyticsEvents,
  categories,
  debts,
  spaces,
  transactions,
} from "@repo/database/schema";
import { ServiceError } from "../lib/errors";
import { parseInput } from "../lib/schema";
import { assertActiveSpaceMember } from "../space";
import {
  cashflowInputSchema,
  categoryBreakdownInputSchema,
  dashboardSummaryInputSchema,
  recordEventInputSchema,
  type CashflowInput,
  type CashflowPoint,
  type CategoryBreakdownInput,
  type CategoryBreakdownRow,
  type DashboardSummary,
  type DashboardSummaryInput,
  type RecordEventInput,
} from "./model";

/**
 * Analytics service.
 *
 * Two distinct concerns, never mixed:
 *
 * 1. Product events  -> `analytics_events` (append-only, dedupe-able).
 *    Written on meaningful actions; never used for money math.
 *
 * 2. Financial aggregates -> computed on read from `transactions` (the
 *    source of truth). Only posted, non-deleted rows count. Split
 *    transactions report the actor's PERSONAL share via `personal_amount`
 *    so a ₹8,000 hotel split 4 ways counts ₹2,000 — never double-counting.
 */

const fmtMoney = (value: number): string => value.toFixed(4);

const monthBounds = (): { fromDate: string; toDate: string } => {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return {
    fromDate: from.toISOString().slice(0, 10),
    toDate: to.toISOString().slice(0, 10),
  };
};

// ---------------------------------------------------------------------------
// 1. Product events
// ---------------------------------------------------------------------------

export async function recordEvent(input: RecordEventInput): Promise<void> {
  const {
    actorUserId,
    spaceId,
    sessionId,
    eventName,
    eventCategory,
    entityType,
    entityId,
    properties,
    idempotencyKey,
  } = parseInput(recordEventInputSchema, input, "recordEvent input");

  try {
    await db.insert(analyticsEvents).values({
      userId: actorUserId,
      spaceId: spaceId ?? null,
      sessionId: sessionId ?? null,
      eventName,
      eventCategory: eventCategory ?? null,
      entityType: entityType ?? null,
      entityId: entityId ?? null,
      properties: properties ?? null,
      idempotencyKey: idempotencyKey ?? null,
    });
  } catch (error) {
    // A duplicate idempotency key means the event was already recorded —
    // that's success, not failure.
    if (
      typeof error === "object" &&
      error !== null &&
      (error as { code?: string }).code === "23505"
    ) {
      return;
    }
    // Analytics must never break the user-facing action that triggered it.
    console.error("[analytics] recordEvent failed:", error);
  }
}

// ---------------------------------------------------------------------------
// 2. Dashboard summary
// ---------------------------------------------------------------------------

const postedRange = (spaceId: string, fromDate: string, toDate: string) =>
  and(
    eq(transactions.spaceId, spaceId),
    eq(transactions.status, "posted"),
    isNull(transactions.deletedAt),
    gte(transactions.date, fromDate),
    lte(transactions.date, toDate),
  );

export async function getDashboardSummary(
  input: DashboardSummaryInput,
): Promise<DashboardSummary> {
  const { spaceId, actorUserId, fromDate, toDate } = parseInput(
    dashboardSummaryInputSchema,
    input,
    "getDashboardSummary input",
  );

  await assertActiveSpaceMember({ spaceId, userId: actorUserId });

  const bounds = monthBounds();
  const effectiveFrom = fromDate ?? bounds.fromDate;
  const effectiveTo = toDate ?? bounds.toDate;

  const [space] = await db
    .select({ baseCurrency: spaces.baseCurrency })
    .from(spaces)
    .where(eq(spaces.id, spaceId))
    .limit(1);
  if (!space) {
    throw new ServiceError("NOT_FOUND", "Space not found");
  }

  // Direction split on the actor's personal share. `personal_amount` is the
  // actor's own economic slice: the full amount for unsplit transactions,
  // the allocated share for split ones (never the gross).
  const [totals] = await db
    .select({
      income: sql<string>`COALESCE(SUM(CASE WHEN ${transactions.type} = 'income' THEN ${transactions.personalAmount} ELSE 0 END), 0)`,
      personalExpense: sql<string>`COALESCE(SUM(CASE WHEN ${transactions.type} = 'expense' THEN ${transactions.personalAmount} ELSE 0 END), 0)`,
      grossExpense: sql<string>`COALESCE(SUM(CASE WHEN ${transactions.type} = 'expense' THEN ${transactions.amount} ELSE 0 END), 0)`,
      refund: sql<string>`COALESCE(SUM(CASE WHEN ${transactions.type} = 'refund' THEN ${transactions.personalAmount} ELSE 0 END), 0)`,
      transactionCount: sql<number>`COUNT(*)::int`,
      splitCount: sql<number>`COUNT(${transactions.billSplitId})::int`,
    })
    .from(transactions)
    .where(postedRange(spaceId, effectiveFrom, effectiveTo));

  // Outstanding debt across open obligations the actor is a party to.
  const debtRows = await db
    .select({
      amount: debts.amount,
      paidAmount: debts.paidAmount,
    })
    .from(debts)
    .where(
      and(
        or(
          eq(debts.creditorUserId, actorUserId),
          eq(debts.debtorUserId, actorUserId),
        ),
        isNull(debts.cancelledAt),
        isNull(debts.settledAt),
      ),
    );
  const outstandingDebt = debtRows.reduce(
    (acc, row) => acc + Math.max(0, Number(row.amount) - Number(row.paidAmount)),
    0,
  );

  return {
    fromDate: effectiveFrom,
    toDate: effectiveTo,
    currency: space.baseCurrency,
    income: totals?.income ?? "0.0000",
    personalExpense: totals?.personalExpense ?? "0.0000",
    grossExpense: totals?.grossExpense ?? "0.0000",
    refund: totals?.refund ?? "0.0000",
    transactionCount: totals?.transactionCount ?? 0,
    splitCount: totals?.splitCount ?? 0,
    outstandingDebt: fmtMoney(outstandingDebt),
  };
}

// ---------------------------------------------------------------------------
// 3. Cash-flow trend (daily buckets)
// ---------------------------------------------------------------------------

export async function getCashflowTrend(
  input: CashflowInput,
): Promise<CashflowPoint[]> {
  const { spaceId, actorUserId, fromDate, toDate } = parseInput(
    cashflowInputSchema,
    input,
    "getCashflowTrend input",
  );

  await assertActiveSpaceMember({ spaceId, userId: actorUserId });

  // Personal share per day, both directions.
  const rows = await db
    .select({
      date: transactions.date,
      income: sql<string>`COALESCE(SUM(CASE WHEN ${transactions.type} = 'income' THEN ${transactions.personalAmount} ELSE 0 END), 0)`,
      expense: sql<string>`COALESCE(SUM(CASE WHEN ${transactions.type} = 'expense' THEN ${transactions.personalAmount} ELSE 0 END), 0)`,
    })
    .from(transactions)
    .where(postedRange(spaceId, fromDate, toDate))
    .groupBy(transactions.date)
    .orderBy(transactions.date);

  // Fill gaps so charts get a continuous series.
  const byDate = new Map(rows.map((r) => [r.date, r]));
  const points: CashflowPoint[] = [];
  const cursor = new Date(`${fromDate}T00:00:00Z`);
  const end = new Date(`${toDate}T00:00:00Z`);
  while (cursor <= end) {
    const key = cursor.toISOString().slice(0, 10);
    const row = byDate.get(key);
    points.push({
      date: key,
      income: Number(row?.income ?? 0),
      expense: Number(row?.expense ?? 0),
    });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return points;
}

// ---------------------------------------------------------------------------
// 4. Category breakdown (personal expense per category)
// ---------------------------------------------------------------------------

export async function getCategoryBreakdown(
  input: CategoryBreakdownInput,
): Promise<CategoryBreakdownRow[]> {
  const { spaceId, actorUserId, fromDate, toDate, limit } = parseInput(
    categoryBreakdownInputSchema,
    input,
    "getCategoryBreakdown input",
  );

  await assertActiveSpaceMember({ spaceId, userId: actorUserId });

  const rows = await db
    .select({
      categoryId: transactions.categoryId,
      name: sql<string>`COALESCE(${categories.name}, 'Uncategorized')`,
      amount: sql<string>`COALESCE(SUM(${transactions.personalAmount}), 0)`,
    })
    .from(transactions)
    .leftJoin(
      categories,
      and(
        eq(categories.id, transactions.categoryId),
        eq(categories.spaceId, transactions.spaceId),
      ),
    )
    .where(
      and(
        postedRange(spaceId, fromDate, toDate),
        eq(transactions.type, "expense"),
      ),
    )
    .groupBy(transactions.categoryId, categories.name)
    .orderBy(sql`COALESCE(SUM(${transactions.personalAmount}), 0) DESC`)
    .limit(limit);      return rows.map((row) => ({
        categoryId: row.categoryId,
        name: row.name,
        amount: Number(row.amount),
      }));
}

export { listEvents } from "./events";

