import { z } from "zod";
import { router, authenticatedProcedure } from "../../trpc";
import { generatePath } from "../../utils/path-generator";
import {
  getDashboardSummary,
  getCashflowTrend,
  getCategoryBreakdown,
} from "@repo/services/analytics";
import { listTransactions } from "@repo/services/transaction";

const TAGS = ["Dashboard"] as string[];
const getPath = generatePath("/dashboard");

const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be a YYYY-MM-DD date");
const uuid = z.string().uuid();

// ---------------------------------------------------------------------------
// Output schemas
// ---------------------------------------------------------------------------

const summaryResponseSchema = z.object({
  fromDate: z.string(),
  toDate: z.string(),
  currency: z.string(),
  income: z.string(),
  personalExpense: z.string(),
  grossExpense: z.string(),
  refund: z.string(),
  transactionCount: z.number().int(),
  splitCount: z.number().int(),
  outstandingDebt: z.string(),
});

const cashflowPointSchema = z.object({
  date: z.string(),
  income: z.number(),
  expense: z.number(),
});

const categoryBreakdownRowSchema = z.object({
  categoryId: z.string().nullable(),
  name: z.string(),
  amount: z.number(),
});

// A light projection of the transaction list row for "recent activity".
const recentTransactionSchema = z.object({
  id: z.string().uuid(),
  type: z.string(),
  status: z.string(),
  amount: z.string(),
  personalAmount: z.string(),
  currency: z.string(),
  description: z.string().nullable(),
  merchant: z.string().nullable(),
  date: z.string(),
  isSplit: z.boolean(),
  createdAt: z.date(),
});

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

export const dashboardRouter = router({
  /** Headline numbers for the period (defaults to the current month). */
  summary: authenticatedProcedure
    .meta({
      openapi: { method: "GET", path: getPath("/summary"), tags: TAGS },
    })
    .input(
      z.object({
        spaceId: uuid,
        fromDate: dateOnly.nullable().optional(),
        toDate: dateOnly.nullable().optional(),
      }),
    )
    .output(summaryResponseSchema)
    .query(async ({ input, ctx }) => {
      return getDashboardSummary({
        spaceId: input.spaceId,
        actorUserId: ctx.user.id,
        fromDate: input.fromDate,
        toDate: input.toDate,
      });
    }),

  /** Daily income/expense series (personal share) for the cash-flow chart. */
  cashflow: authenticatedProcedure
    .meta({
      openapi: { method: "GET", path: getPath("/cashflow"), tags: TAGS },
    })
    .input(
      z.object({
        spaceId: uuid,
        fromDate: dateOnly,
        toDate: dateOnly,
      }),
    )
    .output(z.array(cashflowPointSchema))
    .query(async ({ input, ctx }) => {
      return getCashflowTrend({
        spaceId: input.spaceId,
        actorUserId: ctx.user.id,
        fromDate: input.fromDate,
        toDate: input.toDate,
      });
    }),

  /** Personal expense per category, ranked — feeds the donut/bar charts. */
  categoryBreakdown: authenticatedProcedure
    .meta({
      openapi: {
        method: "GET",
        path: getPath("/category-breakdown"),
        tags: TAGS,
      },
    })
    .input(
      z.object({
        spaceId: uuid,
        fromDate: dateOnly,
        toDate: dateOnly,
        limit: z.number().int().min(1).max(50).optional().default(8),
      }),
    )
    .output(z.array(categoryBreakdownRowSchema))
    .query(async ({ input, ctx }) => {
      return getCategoryBreakdown({
        spaceId: input.spaceId,
        actorUserId: ctx.user.id,
        fromDate: input.fromDate,
        toDate: input.toDate,
        limit: input.limit,
      });
    }),

  /** Latest activity feed (posted + pending, newest first). */
  recentTransactions: authenticatedProcedure
    .meta({
      openapi: {
        method: "GET",
        path: getPath("/recent-transactions"),
        tags: TAGS,
      },
    })
    .input(z.object({ spaceId: uuid, limit: z.number().int().min(1).max(20).optional().default(8) }))
    .output(z.array(recentTransactionSchema))
    .query(async ({ input, ctx }) => {
      const rows = await listTransactions({
        spaceId: input.spaceId,
        actorUserId: ctx.user.id,
        limit: input.limit,
        offset: 0,
      });
      return rows.map((row) => ({
        id: row.id,
        type: row.type,
        status: row.status,
        amount: row.amount,
        personalAmount: row.personalAmount,
        currency: row.currency,
        description: row.description,
        merchant: row.merchant,
        date: row.date,
        isSplit: row.billSplitId != null,
        createdAt: row.createdAt,
      }));
    }),
});
