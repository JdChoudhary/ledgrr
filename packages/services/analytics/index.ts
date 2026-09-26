import { and, db, desc, eq, gte, isNull, lte, or, sql } from "@repo/database";
import {
  analyticsEvents,
  categories,
  categoryGroups,
  debts,
  financialAccounts,
  financialSnapshots,
  goals,
  recurringRules,
  spaces,
  transactions,
} from "@repo/database/schema";
import { ServiceError } from "../lib/errors";
import { parseInput } from "../lib/schema";
import { assertActiveSpaceMember } from "../space";
import {
  analyticsDashboardDataInputSchema,
  analyticsOverviewInputSchema,
  cashflowInputSchema,
  categoryBreakdownInputSchema,
  comparisonInputSchema,
  dailySeriesInputSchema,
  dailySpendInputSchema,
  dashboardSummaryInputSchema,
  fundFlowInputSchema,
  monthlyTrendInputSchema,
  netWorthForecastInputSchema,
  netWorthHistoryInputSchema,
  netWorthInputSchema,
  netWorthProjectionInputSchema,
  recordEventInputSchema,
  topMerchantsInputSchema,
  yearlySeriesInputSchema,
  type AnalyticsDashboardData,
  type AnalyticsDashboardDataInput,
  type AnalyticsOverview,
  type AnalyticsOverviewInput,
  type CashflowInput,
  type CashflowPoint,
  type CategoryBreakdownInput,
  type CategoryBreakdownRow,
  type ComparisonInput,
  type ComparisonRow,
  type DailySeries,
  type DailySeriesInput,
  type DailySpend,
  type DailySpendInput,
  type DashboardSummary,
  type DashboardSummaryInput,
  type FundFlow,
  type FundFlowInput,
  type MonthlyTrendInput,
  type MonthlyTrendRow,
  type NetWorthCurrent,
  type NetWorthForecast,
  type NetWorthForecastInput,
  type NetWorthHistory,
  type NetWorthHistoryInput,
  type NetWorthInput,
  type NetWorthProjection,
  type NetWorthProjectionInput,
  type RecordEventInput,
  type SavingsRate,
  type SpendingVelocity,
  type TopMerchantRow,
  type TopMerchantsInput,
  type YearlySeries,
  type YearlySeriesInput,
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

export async function getDashboardSummary(input: DashboardSummaryInput): Promise<DashboardSummary> {
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
        or(eq(debts.creditorUserId, actorUserId), eq(debts.debtorUserId, actorUserId)),
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

export async function getCashflowTrend(input: CashflowInput): Promise<CashflowPoint[]> {
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
      and(eq(categories.id, transactions.categoryId), eq(categories.spaceId, transactions.spaceId)),
    )
    .where(and(postedRange(spaceId, fromDate, toDate), eq(transactions.type, "expense")))
    .groupBy(transactions.categoryId, categories.name)
    .orderBy(sql`COALESCE(SUM(${transactions.personalAmount}), 0) DESC`)
    .limit(limit);
  return rows.map((row) => ({
    categoryId: row.categoryId,
    name: row.name,
    amount: Number(row.amount),
  }));
}

// ---------------------------------------------------------------------------
// Shared date helpers
// ---------------------------------------------------------------------------

const isoDate = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

const monthKey = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

/** Inclusive range covering the last `months` calendar months (through today). */
const monthRangeBack = (months: number): { fromDate: string; toDate: string } => {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return { fromDate: isoDate(from), toDate: isoDate(to) };
};

/** Inclusive range for a named period (falls back to the current month). */
const periodRange = (period: string): { fromDate: string; toDate: string } => {
  const now = new Date();
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  let from: Date;
  switch (period) {
    case "quarter": {
      const quarterStart = Math.floor(now.getMonth() / 3) * 3;
      from = new Date(now.getFullYear(), quarterStart, 1);
      break;
    }
    case "year":
      from = new Date(now.getFullYear(), 0, 1);
      break;
    case "all":
      from = new Date(2000, 0, 1);
      break;
    case "month":
    default:
      from = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
  }
  return { fromDate: isoDate(from), toDate: isoDate(to) };
};

const daysInclusive = (fromDate: string, toDate: string): number => {
  const from = Date.parse(`${fromDate}T00:00:00Z`);
  const to = Date.parse(`${toDate}T00:00:00Z`);
  return Math.max(1, Math.round((to - from) / 86_400_000) + 1);
};

const shiftDate = (date: string, days: number): string => {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

const percentChange = (current: number, previous: number): number => {
  if (previous === 0) return current === 0 ? 0 : 100;
  return ((current - previous) / Math.abs(previous)) * 100;
};

/** Normalise a recurring rule to an equivalent monthly amount. */
const toMonthlyAmount = (amount: number, frequency: string, interval: number): number => {
  const safeInterval = interval > 0 ? interval : 1;
  switch (frequency) {
    case "daily":
      return (amount * 30) / safeInterval;
    case "weekly":
      return (amount * 4.33) / safeInterval;
    case "yearly":
      return amount / (12 * safeInterval);
    case "monthly":
    default:
      return amount / safeInterval;
  }
};

const getSpaceCurrency = async (spaceId: string): Promise<string> => {
  const [space] = await db
    .select({ baseCurrency: spaces.baseCurrency })
    .from(spaces)
    .where(eq(spaces.id, spaceId))
    .limit(1);
  if (!space) {
    throw new ServiceError("NOT_FOUND", "Space not found");
  }
  return space.baseCurrency;
};

/** Active recurring rules normalised to a monthly income/expense pair. */
const activeRecurringMonthly = async (
  spaceId: string,
): Promise<{ income: number; expense: number; count: number }> => {
  const rules = await db
    .select({
      type: recurringRules.type,
      amount: recurringRules.amount,
      frequency: recurringRules.frequency,
      interval: recurringRules.interval,
    })
    .from(recurringRules)
    .where(and(eq(recurringRules.spaceId, spaceId), eq(recurringRules.status, "active")));

  let income = 0;
  let expense = 0;
  for (const rule of rules) {
    const monthly = toMonthlyAmount(Number(rule.amount), rule.frequency, rule.interval);
    if (rule.type === "income") income += monthly;
    else if (rule.type === "expense") expense += monthly;
  }
  return { income, expense, count: rules.length };
};

// ---------------------------------------------------------------------------
// 5. Insights overview
// ---------------------------------------------------------------------------

export async function getAnalyticsOverview(
  input: AnalyticsOverviewInput,
): Promise<AnalyticsOverview> {
  const { spaceId, actorUserId, period, fromDate, toDate } = parseInput(
    analyticsOverviewInputSchema,
    input,
    "getAnalyticsOverview input",
  );

  await assertActiveSpaceMember({ spaceId, userId: actorUserId });

  const range = fromDate && toDate ? { fromDate, toDate } : periodRange(period);

  const [summaryRow] = await db
    .select({
      income: sql<string>`COALESCE(SUM(CASE WHEN ${transactions.type} = 'income' THEN ${transactions.personalAmount} ELSE 0 END), 0)`,
      expense: sql<string>`COALESCE(SUM(CASE WHEN ${transactions.type} = 'expense' THEN ${transactions.personalAmount} ELSE 0 END), 0)`,
      transfer: sql<string>`COALESCE(SUM(CASE WHEN ${transactions.type} = 'transfer' THEN ${transactions.personalAmount} ELSE 0 END), 0)`,
      refund: sql<string>`COALESCE(SUM(CASE WHEN ${transactions.type} = 'refund' THEN ${transactions.personalAmount} ELSE 0 END), 0)`,
    })
    .from(transactions)
    .where(postedRange(spaceId, range.fromDate, range.toDate));

  const totalIncome = Number(summaryRow?.income ?? 0);
  const totalExpenses = Number(summaryRow?.expense ?? 0);
  const totalTransfers = Number(summaryRow?.transfer ?? 0);
  const totalRefunds = Number(summaryRow?.refund ?? 0);
  const netFlow = totalIncome + totalRefunds - totalExpenses;
  const savingsRate = totalIncome > 0 ? (netFlow / totalIncome) * 100 : 0;

  const categoryRows = await db
    .select({
      categoryId: transactions.categoryId,
      name: sql<string>`COALESCE(${categories.name}, 'Uncategorized')`,
      color: sql<string>`COALESCE(${categories.color}, '#6b7280')`,
      type: transactions.type,
      total: sql<string>`COALESCE(SUM(${transactions.personalAmount}), 0)`,
      count: sql<number>`COUNT(*)::int`,
    })
    .from(transactions)
    .leftJoin(
      categories,
      and(eq(categories.id, transactions.categoryId), eq(categories.spaceId, transactions.spaceId)),
    )
    .where(
      and(
        postedRange(spaceId, range.fromDate, range.toDate),
        or(eq(transactions.type, "expense"), eq(transactions.type, "income")),
      ),
    )
    .groupBy(transactions.categoryId, categories.name, categories.color, transactions.type)
    .orderBy(sql`COALESCE(SUM(${transactions.personalAmount}), 0) DESC`);

  const byCategory = categoryRows.map((row) => ({
    categoryId: row.categoryId,
    categoryName: row.name,
    categoryColor: row.color,
    type: row.type,
    total: Number(row.total),
    count: Number(row.count),
  }));

  const groupRows = await db
    .select({
      groupId: categoryGroups.id,
      groupName: sql<string>`COALESCE(${categoryGroups.name}, 'Ungrouped')`,
      expense: sql<string>`COALESCE(SUM(CASE WHEN ${transactions.type} = 'expense' THEN ${transactions.personalAmount} ELSE 0 END), 0)`,
      income: sql<string>`COALESCE(SUM(CASE WHEN ${transactions.type} = 'income' THEN ${transactions.personalAmount} ELSE 0 END), 0)`,
      count: sql<number>`COUNT(*)::int`,
    })
    .from(transactions)
    .leftJoin(
      categories,
      and(eq(categories.id, transactions.categoryId), eq(categories.spaceId, transactions.spaceId)),
    )
    .innerJoin(categoryGroups, eq(categories.groupId, categoryGroups.id))
    .where(
      and(
        postedRange(spaceId, range.fromDate, range.toDate),
        or(eq(transactions.type, "expense"), eq(transactions.type, "income")),
      ),
    )
    .groupBy(categoryGroups.id, categoryGroups.name);

  const byGroup = groupRows.map((row) => {
    const expense = Number(row.expense);
    const income = Number(row.income);
    return {
      groupId: row.groupId,
      groupName: row.groupName,
      type: income > expense ? "income" : "expense",
      total: expense + income,
      count: Number(row.count),
    };
  });

  const monthRows = await db
    .select({
      month: sql<string>`to_char(${transactions.date}, 'YYYY-MM')`,
      income: sql<string>`COALESCE(SUM(CASE WHEN ${transactions.type} = 'income' THEN ${transactions.personalAmount} ELSE 0 END), 0)`,
      expense: sql<string>`COALESCE(SUM(CASE WHEN ${transactions.type} = 'expense' THEN ${transactions.personalAmount} ELSE 0 END), 0)`,
    })
    .from(transactions)
    .where(postedRange(spaceId, range.fromDate, range.toDate))
    .groupBy(sql`to_char(${transactions.date}, 'YYYY-MM')`)
    .orderBy(sql`to_char(${transactions.date}, 'YYYY-MM')`);

  const byMonth = monthRows.map((row) => {
    const income = Number(row.income);
    const expense = Number(row.expense);
    return { month: row.month, income, expenses: expense, net: income - expense };
  });

  const merchantLabel = sql<string | null>`COALESCE(${transactions.merchant}, ${transactions.description})`;
  const merchantRows = await db
    .select({
      description: merchantLabel,
      total: sql<string>`COALESCE(SUM(${transactions.personalAmount}), 0)`,
      count: sql<number>`COUNT(*)::int`,
    })
    .from(transactions)
    .where(and(postedRange(spaceId, range.fromDate, range.toDate), eq(transactions.type, "expense")))
    .groupBy(merchantLabel)
    .orderBy(sql`COALESCE(SUM(${transactions.personalAmount}), 0) DESC`)
    .limit(10);

  const topMerchants = merchantRows.map((row) => ({
    description: row.description,
    total: Number(row.total),
    count: Number(row.count),
  }));

  const accountRows = await db
    .select({
      accountId: transactions.accountId,
      accountName: sql<string>`COALESCE(${financialAccounts.name}, 'No account')`,
      expense: sql<string>`COALESCE(SUM(CASE WHEN ${transactions.type} = 'expense' THEN ${transactions.personalAmount} ELSE 0 END), 0)`,
      income: sql<string>`COALESCE(SUM(CASE WHEN ${transactions.type} = 'income' THEN ${transactions.personalAmount} ELSE 0 END), 0)`,
      count: sql<number>`COUNT(*)::int`,
    })
    .from(transactions)
    .leftJoin(
      financialAccounts,
      and(
        eq(financialAccounts.id, transactions.accountId),
        eq(financialAccounts.spaceId, transactions.spaceId),
      ),
    )
    .where(
      and(
        postedRange(spaceId, range.fromDate, range.toDate),
        or(eq(transactions.type, "expense"), eq(transactions.type, "income")),
      ),
    )
    .groupBy(transactions.accountId, financialAccounts.name)
    .orderBy(sql`COALESCE(SUM(${transactions.personalAmount}), 0) DESC`);

  const accountBreakdown = accountRows.map((row) => {
    const expense = Number(row.expense);
    const income = Number(row.income);
    return {
      accountId: row.accountId,
      accountName: row.accountName,
      type: income > expense ? "income" : "expense",
      total: expense + income,
      count: Number(row.count),
    };
  });

  return {
    period,
    dateRange: { from: range.fromDate, to: range.toDate },
    summary: {
      totalIncome,
      totalExpenses,
      totalTransfers,
      totalRefunds,
      netFlow,
      savingsRate: Math.round(savingsRate * 100) / 100,
    },
    byCategory,
    byGroup,
    byMonth,
    topMerchants,
    accountBreakdown,
  };
}

// ---------------------------------------------------------------------------
// 6. Dashboard data (daily series + category totals)
// ---------------------------------------------------------------------------

export async function getAnalyticsDashboardData(
  input: AnalyticsDashboardDataInput,
): Promise<AnalyticsDashboardData> {
  const { spaceId, actorUserId, months, fromDate, toDate } = parseInput(
    analyticsDashboardDataInputSchema,
    input,
    "getAnalyticsDashboardData input",
  );

  await assertActiveSpaceMember({ spaceId, userId: actorUserId });

  // An explicit range wins over the trailing-months default.
  const range = fromDate && toDate ? { fromDate, toDate } : monthRangeBack(months);
  // Reuse the existing dashboard aggregate (the same series that powers the
  // dashboard cash-flow chart) instead of recomputing it here.
  const daily = await getCashflowTrend({
    spaceId,
    actorUserId,
    fromDate: range.fromDate,
    toDate: range.toDate,
  });

  const categoryRows = await db
    .select({
      name: sql<string>`COALESCE(${categories.name}, 'Uncategorized')`,
      color: sql<string>`COALESCE(${categories.color}, '#6b7280')`,
      total: sql<string>`COALESCE(SUM(${transactions.personalAmount}), 0)`,
    })
    .from(transactions)
    .leftJoin(
      categories,
      and(eq(categories.id, transactions.categoryId), eq(categories.spaceId, transactions.spaceId)),
    )
    .where(and(postedRange(spaceId, range.fromDate, range.toDate), eq(transactions.type, "expense")))
    .groupBy(categories.name, categories.color)
    .orderBy(sql`COALESCE(SUM(${transactions.personalAmount}), 0) DESC`)
    .limit(12);

  return {
    daily,
    categories: categoryRows.map((row) => ({
      name: row.name,
      color: row.color,
      total: Number(row.total),
    })),
  };
}

// ---------------------------------------------------------------------------
// 7. Net worth
// ---------------------------------------------------------------------------

const computeCurrentNetWorth = async (
  spaceId: string,
  actorUserId: string,
): Promise<NetWorthCurrent> => {
  const accounts = await db
    .select({ type: financialAccounts.type, balance: financialAccounts.balance })
    .from(financialAccounts)
    .where(and(eq(financialAccounts.spaceId, spaceId), isNull(financialAccounts.archivedAt)));

  const sumOfTypes = (types: string[]): number =>
    accounts
      .filter((account) => types.includes(account.type))
      .reduce((acc, account) => acc + Number(account.balance), 0);

  const bankBalance = sumOfTypes(["bank"]);
  const cashBalance = sumOfTypes(["cash", "wallet"]);
  const investmentAccountBalance = sumOfTypes(["investment"]);
  const creditBalance = Math.abs(sumOfTypes(["credit_card"]));
  const loanBalance = Math.abs(sumOfTypes(["loan"]));

  const [debtRow] = await db
    .select({
      iOwe: sql<string>`COALESCE(SUM(CASE WHEN ${debts.debtorUserId} = ${actorUserId} THEN ${debts.amount} - ${debts.paidAmount} ELSE 0 END), 0)`,
      owedToMe: sql<string>`COALESCE(SUM(CASE WHEN ${debts.creditorUserId} = ${actorUserId} THEN ${debts.amount} - ${debts.paidAmount} ELSE 0 END), 0)`,
    })
    .from(debts)
    .where(
      and(
        or(eq(debts.creditorUserId, actorUserId), eq(debts.debtorUserId, actorUserId)),
        isNull(debts.settledAt),
        isNull(debts.cancelledAt),
      ),
    );

  const [goalRow] = await db
    .select({ total: sql<string>`COALESCE(SUM(${goals.currentAmount}), 0)` })
    .from(goals)
    .where(
      and(
        eq(goals.spaceId, spaceId),
        isNull(goals.completedAt),
        isNull(goals.cancelledAt),
      ),
    );

  const savingsGoals = Number(goalRow?.total ?? 0);
  const moneyIOwe = Math.max(0, Number(debtRow?.iOwe ?? 0));
  const moneyOwedToMe = Math.max(0, Number(debtRow?.owedToMe ?? 0));

  const totalAssets =
    bankBalance + cashBalance + investmentAccountBalance + savingsGoals + moneyOwedToMe;
  const totalLiabilities = creditBalance + loanBalance + moneyIOwe;

  return {
    totalBalance: totalAssets - totalLiabilities,
    totalAssets,
    totalLiabilities,
    bankBalance,
    creditBalance,
    cashBalance,
    loanBalance,
    investmentAccountBalance,
    portfolioValue: investmentAccountBalance,
    savingsGoals,
    moneyOwedToMe,
    moneyIOwe,
  };
};

export async function getNetWorth(input: NetWorthInput): Promise<NetWorthCurrent> {
  const { spaceId, actorUserId } = parseInput(netWorthInputSchema, input, "getNetWorth input");
  await assertActiveSpaceMember({ spaceId, userId: actorUserId });
  return computeCurrentNetWorth(spaceId, actorUserId);
}

export async function getNetWorthHistory(input: NetWorthHistoryInput): Promise<NetWorthHistory> {
  const { spaceId, actorUserId, limit } = parseInput(
    netWorthHistoryInputSchema,
    input,
    "getNetWorthHistory input",
  );
  await assertActiveSpaceMember({ spaceId, userId: actorUserId });

  const [snapshotRows, current] = await Promise.all([
    db
      .select()
      .from(financialSnapshots)
      .where(eq(financialSnapshots.spaceId, spaceId))
      .orderBy(desc(financialSnapshots.snapshotDate))
      .limit(limit),
    computeCurrentNetWorth(spaceId, actorUserId),
  ]);

  return {
    snapshots: snapshotRows.map((row) => ({
      id: row.id,
      totalBalance: Number(row.netWorth),
      bankBalance: Number(row.cashBalance),
      creditBalance: Number(row.debtBalance),
      investmentBalance: Number(row.investmentBalance),
      snapshotDate: row.snapshotDate,
    })),
    current,
  };
}

export async function getNetWorthProjection(
  input: NetWorthProjectionInput,
): Promise<NetWorthProjection> {
  const { spaceId, actorUserId, months } = parseInput(
    netWorthProjectionInputSchema,
    input,
    "getNetWorthProjection input",
  );
  await assertActiveSpaceMember({ spaceId, userId: actorUserId });

  const now = new Date();
  const currentMonthDate = new Date(now.getFullYear(), now.getMonth(), 1);
  const current = await computeCurrentNetWorth(spaceId, actorUserId);
  const baselineNetWorth = current.totalBalance;

  const recurring = await activeRecurringMonthly(spaceId);
  let monthlyIncome = recurring.income;
  let monthlyExpenses = recurring.expense;

  // Fall back to the last three completed months when there are no rules.
  if (monthlyIncome === 0 && monthlyExpenses === 0) {
    const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);
    const recent = await db
      .select({
        type: transactions.type,
        total: sql<string>`COALESCE(SUM(${transactions.amount}), 0)`,
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.spaceId, spaceId),
          eq(transactions.status, "posted"),
          isNull(transactions.deletedAt),
          gte(transactions.date, isoDate(threeMonthsAgo)),
        ),
      )
      .groupBy(transactions.type);
    for (const row of recent) {
      const monthly = Number(row.total) / 3;
      if (row.type === "income" || row.type === "refund") monthlyIncome += monthly;
      else if (row.type === "expense") monthlyExpenses += monthly;
    }
  }

  const estimatedMonthlyExpense = monthlyExpenses;
  const monthlyNetFlow = monthlyIncome - estimatedMonthlyExpense;
  const optimisticNetFlow = monthlyIncome - estimatedMonthlyExpense * 0.9;
  const pessimisticNetFlow = monthlyIncome - estimatedMonthlyExpense * 1.2;

  const snapshotRows = await db
    .select({
      snapshotDate: financialSnapshots.snapshotDate,
      netWorth: financialSnapshots.netWorth,
    })
    .from(financialSnapshots)
    .where(eq(financialSnapshots.spaceId, spaceId))
    .orderBy(desc(financialSnapshots.snapshotDate))
    .limit(months + 12);

  const snapshotMonths = new Map<string, number>();
  for (const row of snapshotRows) {
    const key = row.snapshotDate.slice(0, 7);
    if (!snapshotMonths.has(key)) snapshotMonths.set(key, Number(row.netWorth));
  }

  const projection: NetWorthProjection["projection"] = [];
  const lookbackMonths = 6;
  for (let i = lookbackMonths; i >= 0; i--) {
    const date = new Date(currentMonthDate);
    date.setMonth(date.getMonth() - i);
    const key = monthKey(date);
    const label = date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
    const actual = snapshotMonths.get(key) ?? null;
    projection.push({
      month: key,
      label,
      actual,
      projected:
        i > 0 ? actual ?? baselineNetWorth - monthlyNetFlow * i : baselineNetWorth,
      optimistic: actual ?? baselineNetWorth + optimisticNetFlow * i,
      pessimistic: actual ?? baselineNetWorth - pessimisticNetFlow * i,
      monthlyIncome,
      monthlyExpenses: estimatedMonthlyExpense,
    });
  }

  for (let i = 1; i <= months; i++) {
    const date = new Date(currentMonthDate);
    date.setMonth(date.getMonth() + i);
    projection.push({
      month: monthKey(date),
      label: date.toLocaleDateString("en-US", { month: "short", year: "numeric" }),
      actual: null,
      projected: baselineNetWorth + monthlyNetFlow * i,
      optimistic: baselineNetWorth + optimisticNetFlow * i,
      pessimistic: baselineNetWorth - pessimisticNetFlow * i,
      monthlyIncome,
      monthlyExpenses: estimatedMonthlyExpense,
    });
  }

  return {
    projection,
    baseline: {
      netWorth: baselineNetWorth,
      monthlyIncome,
      monthlyExpenses: estimatedMonthlyExpense,
      monthlyNetFlow,
      optimisticNetFlow,
      pessimisticNetFlow,
      totalBudgetLimit: 0,
      currentBudgetSpend: 0,
      recurringRuleCount: recurring.count,
    },
    currentMonth: monthKey(currentMonthDate),
  };
}

// ---------------------------------------------------------------------------
// 8. Dashboard analytics (comparison / velocity / merchants / savings / trend)
// ---------------------------------------------------------------------------

export async function getComparison(input: ComparisonInput): Promise<ComparisonRow[]> {
  const { spaceId, actorUserId, fromDate, toDate } = parseInput(
    comparisonInputSchema,
    input,
    "getComparison input",
  );
  await assertActiveSpaceMember({ spaceId, userId: actorUserId });

  const span = daysInclusive(fromDate, toDate);
  const previousTo = shiftDate(fromDate, -1);
  const previousFrom = shiftDate(previousTo, -(span - 1));

  // Reuse the dashboard summary aggregate for both windows (the old code path).
  const [current, previous] = await Promise.all([
    getDashboardSummary({ spaceId, actorUserId, fromDate, toDate }),
    getDashboardSummary({ spaceId, actorUserId, fromDate: previousFrom, toDate: previousTo }),
  ]);

  const currentSavings =
    Number(current.income) + Number(current.refund) - Number(current.personalExpense);
  const previousSavings =
    Number(previous.income) + Number(previous.refund) - Number(previous.personalExpense);

  return [
    { metric: "Income", changePercent: percentChange(Number(current.income), Number(previous.income)) },
    {
      metric: "Spending",
      changePercent: percentChange(
        Number(current.personalExpense),
        Number(previous.personalExpense),
      ),
    },
    { metric: "Savings", changePercent: percentChange(currentSavings, previousSavings) },
  ];
}

export async function getSpendingVelocity(input: CashflowInput): Promise<SpendingVelocity> {
  const { spaceId, actorUserId, fromDate, toDate } = parseInput(
    cashflowInputSchema,
    input,
    "getSpendingVelocity input",
  );
  await assertActiveSpaceMember({ spaceId, userId: actorUserId });

  const rows = await db
    .select({
      date: transactions.date,
      total: sql<string>`COALESCE(SUM(${transactions.personalAmount}), 0)`,
    })
    .from(transactions)
    .where(and(postedRange(spaceId, fromDate, toDate), eq(transactions.type, "expense")))
    .groupBy(transactions.date)
    .orderBy(transactions.date);

  const daysInPeriod = daysInclusive(fromDate, toDate);
  const total = rows.reduce((acc, row) => acc + Number(row.total), 0);
  const dailyAverage = total / daysInPeriod;

  const midpoint = shiftDate(fromDate, Math.floor(daysInPeriod / 2) - 1);
  const firstHalf = rows.filter((row) => row.date <= midpoint);
  const secondHalf = rows.filter((row) => row.date > midpoint);
  const firstAvg = firstHalf.reduce((acc, row) => acc + Number(row.total), 0) / firstHalf.length;
  const secondAvg = secondHalf.reduce((acc, row) => acc + Number(row.total), 0) / secondHalf.length;
  const threshold = dailyAverage * 0.1;
  const trend: SpendingVelocity["trend"] =
    secondAvg - firstAvg > threshold
      ? "increasing"
      : firstAvg - secondAvg > threshold
        ? "decreasing"
        : "stable";

  const anchor = new Date(`${toDate}T00:00:00Z`);
  const daysInMonth = new Date(anchor.getUTCFullYear(), anchor.getUTCMonth() + 1, 0).getDate();

  return {
    dailyAverage,
    trend,
    daysWithActivity: rows.length,
    daysInPeriod,
    projectedMonthEnd: dailyAverage * daysInMonth,
  };
}

export async function getTopMerchants(input: TopMerchantsInput): Promise<TopMerchantRow[]> {
  const { spaceId, actorUserId, fromDate, toDate, limit } = parseInput(
    topMerchantsInputSchema,
    input,
    "getTopMerchants input",
  );
  await assertActiveSpaceMember({ spaceId, userId: actorUserId });

  const merchantLabel = sql<string>`COALESCE(${transactions.merchant}, ${transactions.description}, 'Unknown')`;
  const rows = await db
    .select({
      merchant: merchantLabel,
      total: sql<string>`COALESCE(SUM(${transactions.personalAmount}), 0)`,
      count: sql<number>`COUNT(*)::int`,
    })
    .from(transactions)
    .where(and(postedRange(spaceId, fromDate, toDate), eq(transactions.type, "expense")))
    .groupBy(merchantLabel)
    .orderBy(sql`COALESCE(SUM(${transactions.personalAmount}), 0) DESC`)
    .limit(limit);

  return rows.map((row) => {
    const totalAmount = Number(row.total);
    const transactionCount = Number(row.count);
    return {
      merchant: row.merchant,
      totalAmount,
      transactionCount,
      avgAmount: transactionCount > 0 ? totalAmount / transactionCount : 0,
    };
  });
}

export async function getSavingsRate(input: CashflowInput): Promise<SavingsRate> {
  const { spaceId, actorUserId, fromDate, toDate } = parseInput(
    cashflowInputSchema,
    input,
    "getSavingsRate input",
  );
  await assertActiveSpaceMember({ spaceId, userId: actorUserId });

  const summary = await getDashboardSummary({ spaceId, actorUserId, fromDate, toDate });
  const income = Number(summary.income) + Number(summary.refund);
  const expense = Number(summary.personalExpense);
  const rate = income > 0 ? ((income - expense) / income) * 100 : 0;

  return { rate, income, expense };
}

export async function getMonthlyTrend(input: MonthlyTrendInput): Promise<MonthlyTrendRow[]> {
  const { spaceId, actorUserId, months } = parseInput(
    monthlyTrendInputSchema,
    input,
    "getMonthlyTrend input",
  );
  await assertActiveSpaceMember({ spaceId, userId: actorUserId });

  const range = monthRangeBack(months);
  const rows = await db
    .select({
      month: sql<string>`to_char(${transactions.date}, 'YYYY-MM')`,
      income: sql<string>`COALESCE(SUM(CASE WHEN ${transactions.type} IN ('income', 'refund') THEN ${transactions.personalAmount} ELSE 0 END), 0)`,
      expense: sql<string>`COALESCE(SUM(CASE WHEN ${transactions.type} = 'expense' THEN ${transactions.personalAmount} ELSE 0 END), 0)`,
    })
    .from(transactions)
    .where(postedRange(spaceId, range.fromDate, range.toDate))
    .groupBy(sql`to_char(${transactions.date}, 'YYYY-MM')`)
    .orderBy(sql`to_char(${transactions.date}, 'YYYY-MM')`);

  const byMonth = new Map(rows.map((row) => [row.month, row]));
  const trend: MonthlyTrendRow[] = [];
  const now = new Date();
  for (let i = months - 1; i >= 0; i--) {
    const key = monthKey(new Date(now.getFullYear(), now.getMonth() - i, 1));
    const row = byMonth.get(key);
    const income = Number(row?.income ?? 0);
    const expense = Number(row?.expense ?? 0);
    trend.push({ month: key, income, expense, net: income - expense });
  }
  return trend;
}

// ---------------------------------------------------------------------------
// 9. Net worth forecast
// ---------------------------------------------------------------------------

export async function getNetWorthForecast(
  input: NetWorthForecastInput,
): Promise<NetWorthForecast> {
  const { spaceId, actorUserId, months, horizon } = parseInput(
    netWorthForecastInputSchema,
    input,
    "getNetWorthForecast input",
  );
  await assertActiveSpaceMember({ spaceId, userId: actorUserId });

  const [currency, current, recurring, trend] = await Promise.all([
    getSpaceCurrency(spaceId),
    computeCurrentNetWorth(spaceId, actorUserId),
    activeRecurringMonthly(spaceId),
    getMonthlyTrend({ spaceId, actorUserId, months }),
  ]);

  const history = trend.map((row) => ({
    month: row.month,
    income: row.income,
    expense: row.expense,
    netFlow: row.net,
  }));

  const monthsWithData = history.filter((row) => row.income !== 0 || row.expense !== 0).length;
  const avgMonthlySavings =
    history.length > 0 ? history.reduce((acc, row) => acc + row.netFlow, 0) / history.length : 0;

  const hasRecurring = recurring.income > 0 || recurring.expense > 0;
  const projectedMonthlyNet = hasRecurring
    ? recurring.income - recurring.expense
    : avgMonthlySavings;

  const basis: NetWorthForecast["basis"] = hasRecurring
    ? "recurring"
    : monthsWithData >= 2
      ? "history"
      : "thin";

  const now = new Date();
  const projection = Array.from({ length: horizon }, (_, index) => {
    const i = index + 1;
    const date = new Date(now.getFullYear(), now.getMonth() + i, 1);
    return {
      month: monthKey(date),
      netFlow: projectedMonthlyNet,
      projectedNetWorth: current.totalBalance + projectedMonthlyNet * i,
    };
  });

  return {
    currency,
    currentNetWorth: current.totalBalance,
    history,
    avgMonthlySavings,
    recurringIncome: recurring.income,
    recurringExpense: recurring.expense,
    projectedMonthlyNet,
    projection,
    basis,
  };
}

// ---------------------------------------------------------------------------
// 10. Daily spend (today + weekday pattern)
// ---------------------------------------------------------------------------

export async function getDailySpend(input: DailySpendInput): Promise<DailySpend> {
  const { spaceId, actorUserId, days } = parseInput(
    dailySpendInputSchema,
    input,
    "getDailySpend input",
  );
  await assertActiveSpaceMember({ spaceId, userId: actorUserId });

  const now = new Date();
  const today = isoDate(now);
  const windowStart = isoDate(new Date(now.getFullYear(), now.getMonth(), now.getDate() - (days - 1)));
  const monthStart = isoDate(new Date(now.getFullYear(), now.getMonth(), 1));

  const [currency, rows] = await Promise.all([
    getSpaceCurrency(spaceId),
    db
      .select({
        date: transactions.date,
        total: sql<string>`COALESCE(SUM(${transactions.personalAmount}), 0)`,
      })
      .from(transactions)
      .where(
        and(
          postedRange(spaceId, windowStart, today),
          eq(transactions.type, "expense"),
        ),
      )
      .groupBy(transactions.date),
  ]);

  const todaySpend = Number(rows.find((row) => row.date === today)?.total ?? 0);
  const monthSpend = rows
    .filter((row) => row.date >= monthStart)
    .reduce((acc, row) => acc + Number(row.total), 0);
  const dayOfMonth = now.getDate();
  const monthDailyAverage = dayOfMonth > 0 ? monthSpend / dayOfMonth : 0;

  // Average spend per weekday, normalised over how often that weekday occurs.
  const weekdayTotals: number[] = [0, 0, 0, 0, 0, 0, 0];
  const weekdayCounts: number[] = [0, 0, 0, 0, 0, 0, 0];
  for (let i = 0; i < days; i++) {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const weekday = date.getDay();
    weekdayCounts[weekday] = (weekdayCounts[weekday] ?? 0) + 1;
  }
  for (const row of rows) {
    const weekday = new Date(`${row.date}T00:00:00Z`).getUTCDay();
    weekdayTotals[weekday] = (weekdayTotals[weekday] ?? 0) + Number(row.total);
  }
  const weekdayAverages = weekdayTotals.map((total, index) => {
    const count = weekdayCounts[index] ?? 0;
    return count > 0 ? total / count : 0;
  });

  const weekdayNames = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  let highestIndex = -1;
  let lowestIndex = -1;
  weekdayAverages.forEach((average, index) => {
    if (average <= 0) return;
    if (highestIndex === -1 || average > (weekdayAverages[highestIndex] ?? 0)) highestIndex = index;
    if (lowestIndex === -1 || average < (weekdayAverages[lowestIndex] ?? 0)) lowestIndex = index;
  });
  const highestWeekday = highestIndex >= 0 ? (weekdayNames[highestIndex] ?? null) : null;
  const lowestWeekday = lowestIndex >= 0 ? (weekdayNames[lowestIndex] ?? null) : null;

  return {
    currency,
    todaySpend,
    monthSpend,
    monthDailyAverage,
    weekdayAverages,
    highestWeekday,
    lowestWeekday,
  };
}

// ---------------------------------------------------------------------------
// 11. Fund flow (income → account → spending + savings, feeds the sankey)
//
// The whole month's movement in one diagram: where income came from, which
// account it landed in, what each account spent it on, and what each account
// kept. Every figure is the actor's PERSONAL share (personal_amount), so a
// split expense only ever counts the part that is actually theirs.
// ---------------------------------------------------------------------------

export async function getFundFlow(input: FundFlowInput): Promise<FundFlow> {
  const { spaceId, actorUserId, fromDate, toDate } = parseInput(
    fundFlowInputSchema,
    input,
    "getFundFlow input",
  );

  await assertActiveSpaceMember({ spaceId, userId: actorUserId });

  const range = postedRange(spaceId, fromDate, toDate);

  const [incomeRows, spendingRows, currency] = await Promise.all([
    // Income streams (refunds count as money coming back in), by account.
    // GROUP BY and ORDER BY use sql.raw() to avoid drizzle duplicating
    // the parameterized fallback strings when the same template appears
    // in both SELECT and GROUP BY.
    db
      .select({
        source: sql<string>`COALESCE(NULLIF(TRIM(${transactions.description}), ''), 'Income')`,
        accountName: sql<string>`COALESCE(${financialAccounts.name}, 'No account')`,
        amount: sql<string>`COALESCE(SUM(${transactions.personalAmount}), 0)`,
      })
      .from(transactions)
      .leftJoin(
        financialAccounts,
        and(
          eq(financialAccounts.id, transactions.accountId),
          eq(financialAccounts.spaceId, transactions.spaceId),
        ),
      )
      .where(and(range, sql`${transactions.type} IN ('income', 'refund')`))
      .groupBy(
        sql.raw(`COALESCE(NULLIF(TRIM("transactions"."description"), ''), 'Income')`),
        sql.raw(`COALESCE("financial_accounts"."name", 'No account')`),
      )
      .orderBy(sql.raw(`COALESCE(SUM("transactions"."personal_amount"), 0) DESC`)),

    // Spending out of each account, by category.
    db
      .select({
        accountName: sql<string>`COALESCE(${financialAccounts.name}, 'No account')`,
        categoryName: sql<string>`COALESCE(${categories.name}, 'Uncategorized')`,
        amount: sql<string>`COALESCE(SUM(${transactions.personalAmount}), 0)`,
      })
      .from(transactions)
      .leftJoin(
        financialAccounts,
        and(
          eq(financialAccounts.id, transactions.accountId),
          eq(financialAccounts.spaceId, transactions.spaceId),
        ),
      )
      .leftJoin(
        categories,
        and(eq(categories.id, transactions.categoryId), eq(categories.spaceId, transactions.spaceId)),
      )
      .where(and(range, eq(transactions.type, "expense")))
      .groupBy(
        sql.raw(`COALESCE("financial_accounts"."name", 'No account')`),
        sql.raw(`COALESCE("categories"."name", 'Uncategorized')`),
      )
      .orderBy(sql.raw(`COALESCE(SUM("transactions"."personal_amount"), 0) DESC`)),

    getSpaceCurrency(spaceId),
  ]);

  const income = incomeRows.map((row) => ({
    source: row.source,
    accountName: row.accountName,
    amount: Number(row.amount),
  }));
  const spending = spendingRows.map((row) => ({
    accountName: row.accountName,
    categoryName: row.categoryName,
    amount: Number(row.amount),
  }));

  const inflowByAccount = new Map<string, number>();
  for (const row of income) {
    inflowByAccount.set(
      row.accountName,
      (inflowByAccount.get(row.accountName) ?? 0) + row.amount,
    );
  }
  const outflowByAccount = new Map<string, number>();
  for (const row of spending) {
    outflowByAccount.set(
      row.accountName,
      (outflowByAccount.get(row.accountName) ?? 0) + row.amount,
    );
  }

  const totalIncome = income.reduce((sum, row) => sum + row.amount, 0);
  const totalExpense = spending.reduce((sum, row) => sum + row.amount, 0);
  const unspent = Math.max(totalIncome - totalExpense, 0);

  // Each account keeps whatever it did not spend. Those leftovers are then
  // scaled so the savings node totals exactly the month's unspent income —
  // otherwise an overdrawn account (money in from elsewhere) would inflate it.
  const leftovers = [...inflowByAccount.entries()]
    .map(([name, inflow]) => ({ accountName: name, amount: inflow - (outflowByAccount.get(name) ?? 0) }))
    .filter((row) => row.amount > 0);
  const leftoverTotal = leftovers.reduce((sum, row) => sum + row.amount, 0);
  const scale = leftoverTotal > 0 ? Math.min(1, unspent / leftoverTotal) : 0;

  const savings = leftovers
    .map((row) => ({ accountName: row.accountName, amount: row.amount * scale }))
    .filter((row) => row.amount > 0.005)
    .sort((a, b) => b.amount - a.amount);

  return {
    currency,
    income,
    spending,
    savings,
    totals: {
      income: totalIncome,
      expense: totalExpense,
      savings: savings.reduce((sum, row) => sum + row.amount, 0),
    },
  };
}

// ---------------------------------------------------------------------------
// 12. Daily series (cursor-paginated window for the load-more list)
// ---------------------------------------------------------------------------

/** Never look past today — analytics only ever covers posted history. */
const HARD_LOOKBACK_DAYS = 729;

export async function getDailySeries(input: DailySeriesInput): Promise<DailySeries> {
  const {
    spaceId,
    actorUserId,
    cursor,
    days,
    fromDate: requestedFloor,
  } = parseInput(dailySeriesInputSchema, input, "getDailySeries input");

  await assertActiveSpaceMember({ spaceId, userId: actorUserId });

  const today = isoDate(new Date());
  // Clamp the window end so we never fetch dates ahead of today.
  let toDate = cursor ?? today;
  if (toDate > today) toDate = today;

  const hardFloor = shiftDate(today, -(HARD_LOOKBACK_DAYS - 1));
  let floor = requestedFloor ?? hardFloor;
  if (floor < hardFloor) floor = hardFloor;
  if (floor > toDate) floor = toDate;

  let fromDate = shiftDate(toDate, -(days - 1));
  if (fromDate < floor) fromDate = floor;

  const items = await getCashflowTrend({ spaceId, actorUserId, fromDate, toDate });
  const nextCursor = fromDate > floor ? shiftDate(fromDate, -1) : null;

  return { items, nextCursor };
}

// ---------------------------------------------------------------------------
// 13. Yearly series (GitHub-style year heatmap + year switcher)
// ---------------------------------------------------------------------------

export async function getYearlySeries(input: YearlySeriesInput): Promise<YearlySeries> {
  const { spaceId, actorUserId, year } = parseInput(
    yearlySeriesInputSchema,
    input,
    "getYearlySeries input",
  );

  await assertActiveSpaceMember({ spaceId, userId: actorUserId });

  const today = isoDate(new Date());
  const currentYear = new Date().getFullYear();
  const targetYear = year ?? currentYear;

  // The whole calendar year, minus anything still in the future — analytics
  // only ever covers posted history, so the in-progress year stops at today.
  const yearStart = `${targetYear}-01-01`;
  const yearEnd = `${targetYear}-12-31`;
  const toDate = yearEnd > today ? today : yearEnd;

  const [days, yearRows, currency] = await Promise.all([
    yearStart > toDate
      ? Promise.resolve<CashflowPoint[]>([])
      : getCashflowTrend({ spaceId, actorUserId, fromDate: yearStart, toDate }),
    db
      .select({ year: sql<string>`EXTRACT(YEAR FROM ${transactions.date})` })
      .from(transactions)
      .where(
        and(
          eq(transactions.spaceId, spaceId),
          eq(transactions.status, "posted"),
          isNull(transactions.deletedAt),
        ),
      )
      .groupBy(sql`EXTRACT(YEAR FROM ${transactions.date})`),
    getSpaceCurrency(spaceId),
  ]);

  // The switcher offers every year that has posted activity, plus the current
  // year (so an empty space still has one selectable entry).
  const years = new Set<number>([currentYear]);
  for (const row of yearRows) {
    const value = Math.trunc(Number(row.year));
    if (Number.isFinite(value) && value >= 1970 && value <= 2100) years.add(value);
  }
  const availableYears = [...years].sort((a, b) => b - a);

  let income = 0;
  let expense = 0;
  let activeDays = 0;
  for (const day of days) {
    income += day.income;
    expense += day.expense;
    if (day.income !== 0 || day.expense !== 0) activeDays += 1;
  }

  return {
    year: targetYear,
    currency,
    days,
    availableYears,
    totals: { income, expense, net: income - expense },
    activeDays,
  };
}

export { listEvents } from "./events";
