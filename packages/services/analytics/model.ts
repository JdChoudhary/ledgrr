import { z } from "zod";
import { dateSchema, userIdSchema, uuidSchema } from "../lib/schema";

/**
 * Product/usage analytics — separate from accounting.
 *
 * Events are written to `analytics_events` on meaningful user actions
 * (transaction created, goal funded, debt settled, ...) and are NEVER used to
 * calculate financial totals — the dashboard's financial aggregates are
 * computed from `transactions` (the source of truth) on read.
 */

// ---------------------------------------------------------------------------
// Record
// ---------------------------------------------------------------------------

export const eventCategorySchema = z.enum([
  "transaction",
  "budget",
  "goal",
  "debt",
  "account",
  "bill_split",
  "recurring",
  "navigation",
]);

export const recordEventInputSchema = z.object({
  actorUserId: userIdSchema,

  sessionId: uuidSchema.nullable().optional(),

  eventName: z.string().trim().min(1).max(120),
  eventCategory: eventCategorySchema.nullable().optional(),

  entityType: z.string().trim().min(1).max(120).nullable().optional(),
  entityId: uuidSchema.nullable().optional(),

  properties: z.record(z.string(), z.unknown()).nullable().optional(),

  /**
   * Dedupe key — repeated calls with the same key are no-ops (unique partial
   * index on idempotency_key). e.g. `transaction_created:<transactionId>`
   * makes double-inserts harmless.
   */
  idempotencyKey: z.string().trim().min(1).max(255).nullable().optional(),
});

export type RecordEventInput = z.input<typeof recordEventInputSchema>;

// ---------------------------------------------------------------------------
// Dashboard summary (financial aggregates, computed from transactions)
// ---------------------------------------------------------------------------

export const dashboardSummaryInputSchema = z.object({
  actorUserId: userIdSchema,
  /** Inclusive ledger-date range. Defaults to the current calendar month. */
  fromDate: dateSchema.nullable().optional(),
  toDate: dateSchema.nullable().optional(),
});

export type DashboardSummaryInput = z.input<typeof dashboardSummaryInputSchema>;

export type DashboardSummary = {
  fromDate: string;
  toDate: string;
  currency: string;
  /** Money received: income + refunds − own share of split expenses... */
  income: string;
  /** Personal expense: the actor's own share (personal_amount), not gross. */
  personalExpense: string;
  /** Gross expense across the user's transactions. */
  grossExpense: string;
  refund: string;
  transactionCount: number;
  splitCount: number;
  /** receivables + payables outstanding across open debts (derived). */
  outstandingDebt: string;
};

// ---------------------------------------------------------------------------
// Cash-flow trend (daily income/expense buckets for charts)
// ---------------------------------------------------------------------------

export const cashflowInputSchema = z.object({
  actorUserId: userIdSchema,
  fromDate: dateSchema,
  toDate: dateSchema,
});

export type CashflowInput = z.input<typeof cashflowInputSchema>;

export type CashflowPoint = {
  date: string;
  income: number;
  expense: number;
};

// ---------------------------------------------------------------------------
// Category breakdown (personal expense per category for the period)
// ---------------------------------------------------------------------------

export const categoryBreakdownInputSchema = z.object({
  actorUserId: userIdSchema,
  fromDate: dateSchema,
  toDate: dateSchema,
  limit: z.number().int().min(1).max(50).optional().default(8),
});

export type CategoryBreakdownInput = z.input<typeof categoryBreakdownInputSchema>;

export type CategoryBreakdownRow = {
  categoryId: string | null;
  name: string;
  amount: number;
};

// ---------------------------------------------------------------------------
// Fund flow (income → account → spending + savings, feeds the sankey)
// ---------------------------------------------------------------------------

export const fundFlowInputSchema = z.object({
  actorUserId: userIdSchema,
  fromDate: dateSchema,
  toDate: dateSchema,
});

export type FundFlowInput = z.input<typeof fundFlowInputSchema>;

/** An income stream and the account it landed in. */
export type FundFlowIncomeRow = {
  /** Income description, or "Income" when the row has none. */
  source: string;
  accountName: string;
  amount: number;
};

/** Money that left an account, by category. */
export type FundFlowSpendingRow = {
  accountName: string;
  categoryName: string;
  amount: number;
};

/**
 * What an account kept this period — its inflow minus its outflow. Only
 * positive leftovers appear; an overdrawn account simply has none.
 */
export type FundFlowSavingsRow = {
  accountName: string;
  amount: number;
};

export type FundFlow = {
  currency: string;
  income: FundFlowIncomeRow[];
  spending: FundFlowSpendingRow[];
  savings: FundFlowSavingsRow[];
  totals: { income: number; expense: number; savings: number };
};

// ---------------------------------------------------------------------------
// Read back events (debug/admin views)
// ---------------------------------------------------------------------------

export const listEventsServiceSchema = z.object({
  actorUserId: userIdSchema,
  limit: z.number().int().min(1).max(200).optional().default(50),
});

export type AnalyticsEventItem = {
  id: string;
  userId: string;
  eventName: string;
  eventCategory: string | null;
  entityType: string | null;
  entityId: string | null;
  properties: unknown;
  occurredAt: Date;
};

// ---------------------------------------------------------------------------
// Insights overview (full analytics payload for the insights page)
// ---------------------------------------------------------------------------

export const analyticsPeriodEnum = z.enum(["month", "quarter", "year", "all"]);
export type AnalyticsPeriod = z.infer<typeof analyticsPeriodEnum>;

export const analyticsOverviewInputSchema = z.object({
  actorUserId: userIdSchema,
  period: analyticsPeriodEnum.optional().default("month"),
  /** Explicit range overrides `period` when both are provided. */
  fromDate: dateSchema.nullable().optional(),
  toDate: dateSchema.nullable().optional(),
});

export type AnalyticsOverviewInput = z.input<typeof analyticsOverviewInputSchema>;

export type AnalyticsOverview = {
  period: string;
  dateRange: { from: string; to: string };
  summary: {
    totalIncome: number;
    totalExpenses: number;
    totalTransfers: number;
    totalRefunds: number;
    netFlow: number;
    savingsRate: number;
  };
  byCategory: Array<{
    categoryId: string | null;
    categoryName: string;
    categoryColor: string;
    type: string;
    total: number;
    count: number;
  }>;
  byGroup: Array<{
    groupId: string | null;
    groupName: string;
    type: string;
    total: number;
    count: number;
  }>;
  byMonth: Array<{ month: string; income: number; expenses: number; net: number }>;
  topMerchants: Array<{ description: string | null; total: number; count: number }>;
  accountBreakdown: Array<{
    accountId: string | null;
    accountName: string;
    type: string;
    total: number;
    count: number;
  }>;
};

// ---------------------------------------------------------------------------
// Dashboard data (daily series + category totals) shared by insights charts
// ---------------------------------------------------------------------------

export const analyticsDashboardDataInputSchema = z.object({
  actorUserId: userIdSchema,
  months: z.number().int().min(1).max(36).optional().default(12),
  /** Explicit range overrides `months` when both are provided. */
  fromDate: dateSchema.nullable().optional(),
  toDate: dateSchema.nullable().optional(),
});

export type AnalyticsDashboardDataInput = z.input<typeof analyticsDashboardDataInputSchema>;

export type AnalyticsDashboardData = {
  daily: CashflowPoint[];
  categories: Array<{ name: string; color: string; total: number }>;
};

// ---------------------------------------------------------------------------
// Daily series (cursor-paginated day-by-day window for the load-more list)
// ---------------------------------------------------------------------------

export const dailySeriesInputSchema = z.object({
  actorUserId: userIdSchema,
  /** Inclusive end date of the window; defaults to today. Never in the future. */
  cursor: dateSchema.nullable().optional(),
  /** Number of days per page. */
  days: z.number().int().min(1).max(31).optional().default(10),
  /** Earliest date to page back to (the selected range start). */
  fromDate: dateSchema.nullable().optional(),
});

export type DailySeriesInput = z.input<typeof dailySeriesInputSchema>;

export type DailySeries = {
  /** Ascending by date. */
  items: CashflowPoint[];
  /** Cursor for the next (older) page, or null when the floor is reached. */
  nextCursor: string | null;
};

// ---------------------------------------------------------------------------
// Yearly series (GitHub-style year heatmap + year switcher)
// ---------------------------------------------------------------------------

export const yearlySeriesInputSchema = z.object({
  actorUserId: userIdSchema,
  /** Calendar year to load; defaults to the current year. */
  year: z.number().int().min(1970).max(2100).nullable().optional(),
});

export type YearlySeriesInput = z.input<typeof yearlySeriesInputSchema>;

export type YearlySeries = {
  /** The year actually covered by `days`. */
  year: number;
  currency: string;
  /** Ascending by date; never contains a date after today. */
  days: CashflowPoint[];
  /** Years with posted activity, newest first (the current year is always included). */
  availableYears: number[];
  totals: { income: number; expense: number; net: number };
  /** Days in the year with any income or expense. */
  activeDays: number;
};

// ---------------------------------------------------------------------------
// Net worth (current, history, projection)
// ---------------------------------------------------------------------------

export const netWorthInputSchema = z.object({
  actorUserId: userIdSchema,
});

export type NetWorthInput = z.input<typeof netWorthInputSchema>;

export type NetWorthCurrent = {
  totalBalance: number;
  totalAssets: number;
  totalLiabilities: number;
  bankBalance: number;
  creditBalance: number;
  cashBalance: number;
  loanBalance: number;
  investmentAccountBalance: number;
  portfolioValue: number;
  savingsGoals: number;
  moneyOwedToMe: number;
  moneyIOwe: number;
};

export const netWorthHistoryInputSchema = z.object({
  actorUserId: userIdSchema,
  limit: z.number().int().min(1).max(365).optional().default(90),
});

export type NetWorthHistoryInput = z.input<typeof netWorthHistoryInputSchema>;

export type NetWorthSnapshot = {
  id: string;
  totalBalance: number;
  bankBalance: number;
  creditBalance: number;
  investmentBalance: number;
  snapshotDate: string;
};

export type NetWorthHistory = {
  snapshots: NetWorthSnapshot[];
  current: NetWorthCurrent;
};

export const netWorthProjectionInputSchema = z.object({
  actorUserId: userIdSchema,
  months: z.number().int().min(1).max(36).optional().default(12),
});

export type NetWorthProjectionInput = z.input<typeof netWorthProjectionInputSchema>;

export type NetWorthProjectionPoint = {
  month: string;
  label: string;
  actual: number | null;
  projected: number;
  optimistic: number;
  pessimistic: number;
  monthlyIncome: number;
  monthlyExpenses: number;
};

export type NetWorthProjectionBaseline = {
  netWorth: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  monthlyNetFlow: number;
  optimisticNetFlow: number;
  pessimisticNetFlow: number;
  totalBudgetLimit: number;
  currentBudgetSpend: number;
  recurringRuleCount: number;
};

export type NetWorthProjection = {
  projection: NetWorthProjectionPoint[];
  baseline: NetWorthProjectionBaseline;
  currentMonth: string;
};

// ---------------------------------------------------------------------------
// Dashboard analytics (comparison, velocity, merchants, savings rate, daily)
// ---------------------------------------------------------------------------

export const comparisonInputSchema = z.object({
  actorUserId: userIdSchema,
  fromDate: dateSchema,
  toDate: dateSchema,
});

export type ComparisonInput = z.input<typeof comparisonInputSchema>;

export type ComparisonRow = { metric: string; changePercent: number };

export type SavingsRate = { rate: number; income: number; expense: number };

export type SpendingVelocity = {
  dailyAverage: number;
  trend: "increasing" | "decreasing" | "stable";
  daysWithActivity: number;
  daysInPeriod: number;
  projectedMonthEnd: number;
};

export const topMerchantsInputSchema = z.object({
  actorUserId: userIdSchema,
  fromDate: dateSchema,
  toDate: dateSchema,
  limit: z.number().int().min(1).max(50).optional().default(5),
});

export type TopMerchantsInput = z.input<typeof topMerchantsInputSchema>;

export type TopMerchantRow = {
  merchant: string;
  totalAmount: number;
  transactionCount: number;
  avgAmount: number;
};

export const monthlyTrendInputSchema = z.object({
  actorUserId: userIdSchema,
  months: z.number().int().min(1).max(36).optional().default(6),
});

export type MonthlyTrendInput = z.input<typeof monthlyTrendInputSchema>;

export type MonthlyTrendRow = { month: string; income: number; expense: number; net: number };

export const dailySpendInputSchema = z.object({
  actorUserId: userIdSchema,
  days: z.number().int().min(1).max(365).optional().default(90),
});

export type DailySpendInput = z.input<typeof dailySpendInputSchema>;

export type DailySpend = {
  currency: string;
  todaySpend: number;
  monthSpend: number;
  monthDailyAverage: number;
  /** Average spend per weekday, Sunday(0) → Saturday(6). */
  weekdayAverages: number[];
  highestWeekday: string | null;
  lowestWeekday: string | null;
};

// ---------------------------------------------------------------------------
// Net worth forecast (recurring rules + prior months projection)
// ---------------------------------------------------------------------------

export const netWorthForecastInputSchema = z.object({
  actorUserId: userIdSchema,
  /** Lookback window of completed months used for the historical basis. */
  months: z.number().int().min(1).max(24).optional().default(3),
  /** How many months to project forward. */
  horizon: z.number().int().min(1).max(36).optional().default(6),
});

export type NetWorthForecastInput = z.input<typeof netWorthForecastInputSchema>;

export type NetWorthForecast = {
  currency: string;
  currentNetWorth: number;
  history: Array<{ month: string; income: number; expense: number; netFlow: number }>;
  avgMonthlySavings: number;
  recurringIncome: number;
  recurringExpense: number;
  projectedMonthlyNet: number;
  projection: Array<{ month: string; netFlow: number; projectedNetWorth: number }>;
  basis: "recurring" | "history" | "thin";
};
