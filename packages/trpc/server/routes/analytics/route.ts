import { z } from "zod";
import { router, authenticatedProcedure } from "../../trpc";
import { generatePath } from "../../utils/path-generator";
import {
  recordEvent,
  listEvents,
  getComparison,
  getSpendingVelocity,
  getTopMerchants,
  getSavingsRate,
  getNetWorth,
  getNetWorthHistory,
  getNetWorthProjection,
  getNetWorthForecast,
  getDailySpend,
  getMonthlyTrend,
  getAnalyticsOverview,
  getAnalyticsDashboardData,
  getDailySeries,
  getYearlySeries,
} from "@repo/services/analytics";
import {
  trackEventSchema,
  trackEventResponseSchema,
  listEventsSchema,
  analyticsEventSchema,
} from "./model";

const TAGS = ["Analytics"] as string[];
const getPath = generatePath("/analytics");

const uuid = z.uuid();
const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be a YYYY-MM-DD date");

// ---------------------------------------------------------------------------
// Output schemas (mirror the service return shapes)
// ---------------------------------------------------------------------------

const netWorthCurrentSchema = z.object({
  totalBalance: z.number(),
  totalAssets: z.number(),
  totalLiabilities: z.number(),
  bankBalance: z.number(),
  creditBalance: z.number(),
  cashBalance: z.number(),
  loanBalance: z.number(),
  investmentAccountBalance: z.number(),
  portfolioValue: z.number(),
  savingsGoals: z.number(),
  moneyOwedToMe: z.number(),
  moneyIOwe: z.number(),
});

const monthlyTrendRowSchema = z.object({
  month: z.string(),
  income: z.number(),
  expense: z.number(),
  net: z.number(),
});

const comparisonRowSchema = z.object({
  metric: z.string(),
  changePercent: z.number(),
});

const velocitySchema = z.object({
  dailyAverage: z.number(),
  trend: z.enum(["increasing", "decreasing", "stable"]),
  daysWithActivity: z.number().int(),
  daysInPeriod: z.number().int(),
  projectedMonthEnd: z.number(),
});

const topMerchantSchema = z.object({
  merchant: z.string(),
  totalAmount: z.number(),
  transactionCount: z.number().int(),
  avgAmount: z.number(),
});

const savingsRateSchema = z.object({
  rate: z.number(),
  income: z.number(),
  expense: z.number(),
});

const dailySpendSchema = z.object({
  currency: z.string(),
  todaySpend: z.number(),
  monthSpend: z.number(),
  monthDailyAverage: z.number(),
  weekdayAverages: z.array(z.number()).length(7),
  highestWeekday: z.string().nullable(),
  lowestWeekday: z.string().nullable(),
});

const netWorthForecastSchema = z.object({
  currency: z.string(),
  currentNetWorth: z.number(),
  history: z.array(
    z.object({
      month: z.string(),
      income: z.number(),
      expense: z.number(),
      netFlow: z.number(),
    }),
  ),
  avgMonthlySavings: z.number(),
  recurringIncome: z.number(),
  recurringExpense: z.number(),
  projectedMonthlyNet: z.number(),
  projection: z.array(
    z.object({
      month: z.string(),
      netFlow: z.number(),
      projectedNetWorth: z.number(),
    }),
  ),
  basis: z.enum(["recurring", "history", "thin"]),
});

const netWorthHistorySchema = z.object({
  snapshots: z.array(
    z.object({
      id: z.string(),
      totalBalance: z.number(),
      bankBalance: z.number(),
      creditBalance: z.number(),
      investmentBalance: z.number(),
      snapshotDate: z.string(),
    }),
  ),
  current: netWorthCurrentSchema,
});

const projectionPointSchema = z.object({
  month: z.string(),
  label: z.string(),
  actual: z.number().nullable(),
  projected: z.number(),
  optimistic: z.number(),
  pessimistic: z.number(),
  monthlyIncome: z.number(),
  monthlyExpenses: z.number(),
});

const netWorthProjectionSchema = z.object({
  projection: z.array(projectionPointSchema),
  baseline: z.object({
    netWorth: z.number(),
    monthlyIncome: z.number(),
    monthlyExpenses: z.number(),
    monthlyNetFlow: z.number(),
    optimisticNetFlow: z.number(),
    pessimisticNetFlow: z.number(),
    totalBudgetLimit: z.number(),
    currentBudgetSpend: z.number(),
    recurringRuleCount: z.number().int(),
  }),
  currentMonth: z.string(),
});

const overviewSchema = z.object({
  period: z.string(),
  dateRange: z.object({ from: z.string(), to: z.string() }),
  summary: z.object({
    totalIncome: z.number(),
    totalExpenses: z.number(),
    totalTransfers: z.number(),
    totalRefunds: z.number(),
    netFlow: z.number(),
    savingsRate: z.number(),
  }),
  byCategory: z.array(
    z.object({
      categoryId: z.string().nullable(),
      categoryName: z.string(),
      categoryColor: z.string(),
      type: z.string(),
      total: z.number(),
      count: z.number().int(),
    }),
  ),
  byGroup: z.array(
    z.object({
      groupId: z.string().nullable(),
      groupName: z.string(),
      type: z.string(),
      total: z.number(),
      count: z.number().int(),
    }),
  ),
  byMonth: z.array(
    z.object({
      month: z.string(),
      income: z.number(),
      expenses: z.number(),
      net: z.number(),
    }),
  ),
  topMerchants: z.array(
    z.object({
      description: z.string().nullable(),
      total: z.number(),
      count: z.number().int(),
    }),
  ),
  accountBreakdown: z.array(
    z.object({
      accountId: z.string().nullable(),
      accountName: z.string(),
      type: z.string(),
      total: z.number(),
      count: z.number().int(),
    }),
  ),
});

const dashboardDataSchema = z.object({
  daily: z.array(
    z.object({
      date: z.string(),
      income: z.number(),
      expense: z.number(),
    }),
  ),
  categories: z.array(
    z.object({
      name: z.string(),
      color: z.string(),
      total: z.number(),
    }),
  ),
});

const dailySeriesSchema = z.object({
  items: z.array(
    z.object({
      date: z.string(),
      income: z.number(),
      expense: z.number(),
    }),
  ),
  nextCursor: z.string().nullable(),
});

const yearlySeriesSchema = z.object({
  year: z.number().int(),
  currency: z.string(),
  days: z.array(
    z.object({
      date: z.string(),
      income: z.number(),
      expense: z.number(),
    }),
  ),
  availableYears: z.array(z.number().int()),
  totals: z.object({ income: z.number(), expense: z.number(), net: z.number() }),
  activeDays: z.number().int(),
});

// Shared input fragments
const rangeInput = z.object({ spaceId: uuid, fromDate: dateOnly, toDate: dateOnly });

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

export const analyticsRouter = router({
  /**
   * Record a product event from the client (page views, feature usage).
   * Safe to fire-and-forget from the UI; duplicate idempotency keys are
   * silently dropped server-side.
   */
  track: authenticatedProcedure
    .meta({
      openapi: { method: "POST", path: getPath("/events"), tags: TAGS },
    })
    .input(trackEventSchema)
    .output(trackEventResponseSchema)
    .mutation(async ({ input, ctx }) => {
      await recordEvent({
        ...input,
        actorUserId: ctx.user.id,
      });
      return { ok: true };
    }),

  /** Recent events for the actor (debug/insights views). */
  list: authenticatedProcedure
    .meta({
      openapi: { method: "GET", path: getPath("/events"), tags: TAGS },
    })
    .input(listEventsSchema)
    .output(z.array(analyticsEventSchema))
    .query(async ({ input, ctx }) => {
      return listEvents({
        actorUserId: ctx.user.id,
        spaceId: input.spaceId,
        limit: input.limit,
      });
    }),

  // -- Dashboard analytics --------------------------------------------------

  /** Period-over-period change for income, spending, and savings. */
  comparison: authenticatedProcedure
    .meta({ openapi: { method: "GET", path: getPath("/comparison"), tags: TAGS } })
    .input(rangeInput)
    .output(z.array(comparisonRowSchema))
    .query(async ({ input, ctx }) => {
      return getComparison({ ...input, actorUserId: ctx.user.id });
    }),

  /** Spending velocity: daily average, trend, and month-end projection. */
  velocity: authenticatedProcedure
    .meta({ openapi: { method: "GET", path: getPath("/velocity"), tags: TAGS } })
    .input(rangeInput)
    .output(velocitySchema)
    .query(async ({ input, ctx }) => {
      return getSpendingVelocity({ ...input, actorUserId: ctx.user.id });
    }),

  /** Top merchants by personal spend in the period. */
  topMerchants: authenticatedProcedure
    .meta({ openapi: { method: "GET", path: getPath("/top-merchants"), tags: TAGS } })
    .input(
      z.object({
        spaceId: uuid,
        fromDate: dateOnly,
        toDate: dateOnly,
        limit: z.number().int().min(1).max(50).optional().default(5),
      }),
    )
    .output(z.array(topMerchantSchema))
    .query(async ({ input, ctx }) => {
      return getTopMerchants({ ...input, actorUserId: ctx.user.id });
    }),

  /** Savings rate: (income + refunds − personal expense) / income. */
  savingsRate: authenticatedProcedure
    .meta({ openapi: { method: "GET", path: getPath("/savings-rate"), tags: TAGS } })
    .input(rangeInput)
    .output(savingsRateSchema)
    .query(async ({ input, ctx }) => {
      return getSavingsRate({ ...input, actorUserId: ctx.user.id });
    }),

  /** Monthly income/expense/net trend over the last N calendar months. */
  monthlyTrend: authenticatedProcedure
    .meta({ openapi: { method: "GET", path: getPath("/monthly-trend"), tags: TAGS } })
    .input(
      z.object({
        spaceId: uuid,
        months: z.number().int().min(1).max(36).optional().default(6),
      }),
    )
    .output(z.array(monthlyTrendRowSchema))
    .query(async ({ input, ctx }) => {
      return getMonthlyTrend({ ...input, actorUserId: ctx.user.id });
    }),

  /** Daily spend: today, month-to-date, and weekday spending pattern. */
  dailySpend: authenticatedProcedure
    .meta({ openapi: { method: "GET", path: getPath("/daily-spend"), tags: TAGS } })
    .input(
      z.object({
        spaceId: uuid,
        days: z.number().int().min(1).max(365).optional().default(90),
      }),
    )
    .output(dailySpendSchema)
    .query(async ({ input, ctx }) => {
      return getDailySpend({ ...input, actorUserId: ctx.user.id });
    }),

  // -- Net worth ------------------------------------------------------------

  /** Current net worth: assets (accounts + receivables) minus liabilities. */
  netWorth: authenticatedProcedure
    .meta({ openapi: { method: "GET", path: getPath("/net-worth"), tags: TAGS } })
    .input(z.object({ spaceId: uuid }))
    .output(netWorthCurrentSchema)
    .query(async ({ input, ctx }) => {
      return getNetWorth({ spaceId: input.spaceId, actorUserId: ctx.user.id });
    }),

  /** Net worth snapshots over time plus the live current position. */
  netWorthHistory: authenticatedProcedure
    .meta({ openapi: { method: "GET", path: getPath("/net-worth-history"), tags: TAGS } })
    .input(
      z.object({
        spaceId: uuid,
        limit: z.number().int().min(1).max(365).optional().default(90),
      }),
    )
    .output(netWorthHistorySchema)
    .query(async ({ input, ctx }) => {
      return getNetWorthHistory({
        spaceId: input.spaceId,
        actorUserId: ctx.user.id,
        limit: input.limit,
      });
    }),

  /** Net worth projection with optimistic/pessimistic bounds. */
  netWorthProjection: authenticatedProcedure
    .meta({ openapi: { method: "GET", path: getPath("/net-worth-projection"), tags: TAGS } })
    .input(
      z.object({
        spaceId: uuid,
        months: z.number().int().min(1).max(36).optional().default(12),
      }),
    )
    .output(netWorthProjectionSchema)
    .query(async ({ input, ctx }) => {
      return getNetWorthProjection({
        spaceId: input.spaceId,
        actorUserId: ctx.user.id,
        months: input.months,
      });
    }),

  /**
   * Net worth forecast: active recurring rules + prior-month net flow
   * projected forward from the current net worth.
   */
  netWorthForecast: authenticatedProcedure
    .meta({ openapi: { method: "GET", path: getPath("/net-worth-forecast"), tags: TAGS } })
    .input(
      z.object({
        spaceId: uuid,
        months: z.number().int().min(1).max(24).optional().default(3),
        horizon: z.number().int().min(1).max(36).optional().default(6),
      }),
    )
    .output(netWorthForecastSchema)
    .query(async ({ input, ctx }) => {
      return getNetWorthForecast({
        spaceId: input.spaceId,
        actorUserId: ctx.user.id,
        months: input.months,
        horizon: input.horizon,
      });
    }),

  // -- Insights pages -------------------------------------------------------

  /**
   * Comprehensive analytics for the insights page: summary, category/group
   * breakdowns, monthly trend, top merchants, and account activity.
   */
  overview: authenticatedProcedure
    .meta({ openapi: { method: "GET", path: getPath("/overview"), tags: TAGS } })
    .input(
      z.object({
        spaceId: uuid,
        period: z.enum(["month", "quarter", "year", "all"]).optional().default("month"),
        fromDate: dateOnly.nullable().optional(),
        toDate: dateOnly.nullable().optional(),
      }),
    )
    .output(overviewSchema)
    .query(async ({ input, ctx }) => {
      return getAnalyticsOverview({
        spaceId: input.spaceId,
        actorUserId: ctx.user.id,
        period: input.period,
        fromDate: input.fromDate,
        toDate: input.toDate,
      });
    }),

  /**
   * Daily income/expense series + category totals, used by the comparison,
   * forecast, and daily-spend pages.
   */
  dashboardData: authenticatedProcedure
    .meta({ openapi: { method: "GET", path: getPath("/dashboard-data"), tags: TAGS } })
    .input(
      z.object({
        spaceId: uuid,
        months: z.number().int().min(1).max(36).optional().default(12),
        fromDate: dateOnly.nullable().optional(),
        toDate: dateOnly.nullable().optional(),
      }),
    )
    .output(dashboardDataSchema)
    .query(async ({ input, ctx }) => {
      return getAnalyticsDashboardData({
        spaceId: input.spaceId,
        actorUserId: ctx.user.id,
        months: input.months,
        fromDate: input.fromDate,
        toDate: input.toDate,
      });
    }),

  /**
   * Cursor-paginated day-by-day income/expense window. Pages backwards in
   * `days`-sized chunks from `cursor` (default today) down to the selected
   * range start, never returning dates ahead of today.
   */
  dailySeries: authenticatedProcedure
    .meta({ openapi: { method: "GET", path: getPath("/daily-series"), tags: TAGS } })
    .input(
      z.object({
        spaceId: uuid,
        cursor: dateOnly.nullable().optional(),
        days: z.number().int().min(1).max(31).optional().default(10),
        fromDate: dateOnly.nullable().optional(),
      }),
    )
    .output(dailySeriesSchema)
    .query(async ({ input, ctx }) => {
      return getDailySeries({
        spaceId: input.spaceId,
        actorUserId: ctx.user.id,
        cursor: input.cursor,
        days: input.days,
        fromDate: input.fromDate,
      });
    }),

  /**
   * A full calendar year of daily income/expense, never past today. Feeds the
   * GitHub-style year heatmap and its year switcher.
   */
  yearlySeries: authenticatedProcedure
    .meta({ openapi: { method: "GET", path: getPath("/yearly-series"), tags: TAGS } })
    .input(
      z.object({
        spaceId: uuid,
        year: z.number().int().min(1970).max(2100).nullable().optional(),
      }),
    )
    .output(yearlySeriesSchema)
    .query(async ({ input, ctx }) => {
      return getYearlySeries({
        spaceId: input.spaceId,
        actorUserId: ctx.user.id,
        year: input.year,
      });
    }),
});
