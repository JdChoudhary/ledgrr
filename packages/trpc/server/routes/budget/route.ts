import { z } from "../../schema";
import { router, authenticatedProcedure } from "../../trpc";
import { generatePath } from "../../utils/path-generator";
import {
  budgetStatus,
  createBudget,
  getBudget,
  listBudgets,
  listGroupedBudgets,
  listBudgetPeriods,
  updateBudget,
  archiveBudget,
  unarchiveBudget,
} from "@repo/services/budget";

import {
  createBudgetSchema,
  updateBudgetSchema,
  budgetLookupSchema,
  listBudgetsSchema,
  budgetResponseSchema,
} from "./model";

const TAGS = ["Budgets"] as string[];
const getPath = generatePath("/budgets");

// ---------------------------------------------------------------------------
// Response schemas (for OpenAPI)
// ---------------------------------------------------------------------------

const budgetPeriodResponseSchema = z.object({
  id: z.string(),
  budgetId: z.string(),
  userId: z.string(),
  periodStart: z.string(),
  periodEnd: z.string(),
  limitAmount: z.string(),
  rolloverIn: z.string(),
  actualSpend: z.string().nullable(),
  closedAt: z.date().nullable(),
  createdAt: z.date(),
});

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

export const budgetRouter = router({
  // -- CRUD ------------------------------------------------------------------

  create: authenticatedProcedure
    .meta({ openapi: { method: "POST", path: getPath(""), tags: TAGS } })
    .input(createBudgetSchema)
    .output(budgetResponseSchema)
    .mutation(async ({ input, ctx }) => {
      const result = await createBudget({ ...input, actorUserId: ctx.user.id });
      return result;
    }),

  get: authenticatedProcedure
    .meta({ openapi: { method: "GET", path: getPath("/{budgetId}"), tags: TAGS } })
    .input(budgetLookupSchema)
    .output(budgetResponseSchema)
    .query(async ({ input, ctx }) => {
      const result = await getBudget({ ...input, actorUserId: ctx.user.id });
      return result;
    }),

  list: authenticatedProcedure
    .meta({ openapi: { method: "GET", path: getPath(""), tags: TAGS } })
    .input(listBudgetsSchema)
    .output(z.array(budgetResponseSchema))
    .query(async ({ input, ctx }) => {
      const results = await listBudgets({ ...input, actorUserId: ctx.user.id });
      return [...results];
    }),

  /**
   * Budgets grouped by category group → category, one budget per category.
   * Names are display-only; identifiers are stable IDs.
   */
  listGrouped: authenticatedProcedure
    .meta({
      openapi: { method: "GET", path: getPath("/grouped"), tags: TAGS },
    })
    .input(listBudgetsSchema)
    .output(
      z.object({
        groups: z.array(
          z.object({
            id: z.string(),
            name: z.string(),
            categories: z.array(
              z.object({
                id: z.string(),
                name: z.string(),
                color: z.string(),
                budget: budgetResponseSchema.nullable(),
              }),
            ),
          }),
        ),
        // Expense categories without a category group.
        ungrouped: z.array(
          z.object({
            id: z.string(),
            name: z.string(),
            color: z.string(),
            budget: budgetResponseSchema.nullable(),
          }),
        ),
      }),
    )
    .query(async ({ input, ctx }) => {
      return listGroupedBudgets({ ...input, actorUserId: ctx.user.id });
    }),

  update: authenticatedProcedure
    .meta({ openapi: { method: "PATCH", path: getPath("/{budgetId}"), tags: TAGS } })
    .input(updateBudgetSchema)
    .output(budgetResponseSchema)
    .mutation(async ({ input, ctx }) => {
      const result = await updateBudget({ ...input, actorUserId: ctx.user.id });
      return result;
    }),

  archive: authenticatedProcedure
    .meta({
      openapi: {
        method: "POST",
        path: getPath("/{budgetId}/archive"),
        tags: TAGS,
      },
    })
    .input(budgetLookupSchema)
    .output(budgetResponseSchema)
    .mutation(async ({ input, ctx }) => {
      const result = await archiveBudget({ ...input, actorUserId: ctx.user.id });
      return result;
    }),

  unarchive: authenticatedProcedure
    .meta({
      openapi: {
        method: "POST",
        path: getPath("/{budgetId}/unarchive"),
        tags: TAGS,
      },
    })
    .input(budgetLookupSchema)
    .output(budgetResponseSchema)
    .mutation(async ({ input, ctx }) => {
      const result = await unarchiveBudget({ ...input, actorUserId: ctx.user.id });
      return result;
    }),

  // -- Periods ----------------------------------------------------------------

  listPeriods: authenticatedProcedure
    .meta({
      openapi: {
        method: "GET",
        path: getPath("/{budgetId}/periods"),
        tags: TAGS,
      },
    })
    .input(budgetLookupSchema)
    .output(z.array(budgetPeriodResponseSchema))
    .query(async ({ input, ctx }) => {
      const results = await listBudgetPeriods({ ...input, actorUserId: ctx.user.id });
      return [...results];
    }),

  // -- Live status -------------------------------------------------------------

  /**
   * Live status for a budget: materializes missing occurrences, closes elapsed
   * ones (actual spend + rollover), and reports the current occurrence with
   * live spend, remaining, percent used and state.
   */
  status: authenticatedProcedure
    .meta({
      openapi: {
        method: "GET",
        path: getPath("/{budgetId}/status"),
        tags: TAGS,
      },
    })
    .input(budgetLookupSchema)
    .output(
      z.object({
        budgetId: z.string(),
        period: z
          .object({
            periodStart: z.string(),
            periodEnd: z.string(),
            limitAmount: z.string(),
            rolloverIn: z.string(),
          })
          .nullable(),
        liveSpend: z.string(),
        remaining: z.string(),
        percentUsed: z.number(),
        state: z.enum(["on_track", "warning", "over"]),
      }),
    )
    .query(async ({ input, ctx }) => {
      return budgetStatus({ ...input, actorUserId: ctx.user.id });
    }),
});
