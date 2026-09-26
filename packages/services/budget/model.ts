import { z } from "zod";
import {
  positiveMoneySchema,
  userIdSchema,
  uuidSchema,
  dateSchema,
} from "../lib/schema";

/**
 * Input contracts for the budget service.
 *
 * A budget targets exactly one category — never a category group and never a
 * custom name. The category's group is always derived through
 * budget → category → category_group.
 */

export const budgetPeriodTypeSchema = z.enum([
  "weekly",
  "monthly",
  "quarterly",
  "yearly",
  "custom",
]);

export type BudgetPeriodType = z.infer<typeof budgetPeriodTypeSchema>;

// -------------------------------------------------------------------
// Create
// -------------------------------------------------------------------

export const createBudgetInputSchema = z
  .object({
    actorUserId: userIdSchema,
    categoryId: uuidSchema,
    periodType: budgetPeriodTypeSchema,
    startsOn: dateSchema,
    endsOn: dateSchema.nullable().optional(),
    limitAmount: positiveMoneySchema(),
    rollover: z.boolean().optional().default(false),
    alertThresholdPercent: z.number().int().min(1).max(100).nullable().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.endsOn && value.endsOn < value.startsOn) {
      ctx.addIssue({
        code: "custom",
        path: ["endsOn"],
        message: "endsOn must be >= startsOn",
      });
    }
    // A custom budget is a single occurrence — it needs an explicit end date.
    if (value.periodType === "custom" && !value.endsOn) {
      ctx.addIssue({
        code: "custom",
        path: ["endsOn"],
        message: "endsOn is required when periodType is custom",
      });
    }
  });

export type CreateBudgetInput = z.input<typeof createBudgetInputSchema>;

// -------------------------------------------------------------------
// Update
// -------------------------------------------------------------------

export const updateBudgetInputSchema = z
  .object({
    actorUserId: userIdSchema,
    budgetId: uuidSchema,
    /** Moving a budget to a different category (same user, expense-eligible). */
    categoryId: uuidSchema.optional(),
    limitAmount: positiveMoneySchema().optional(),
    rollover: z.boolean().optional(),
    alertThresholdPercent: z.number().int().min(1).max(100).nullable().optional(),
    endsOn: dateSchema.nullable().optional(),
  })
  .refine(
    (v) =>
      v.categoryId !== undefined ||
      v.limitAmount !== undefined ||
      v.rollover !== undefined ||
      v.alertThresholdPercent !== undefined ||
      v.endsOn !== undefined,
    { message: "Provide at least one field to update" },
  );

export type UpdateBudgetInput = z.input<typeof updateBudgetInputSchema>;

// -------------------------------------------------------------------
// Lookup / List
// -------------------------------------------------------------------

export const budgetLookupSchema = z.object({
  actorUserId: userIdSchema,
  budgetId: uuidSchema,
});

export type BudgetLookupInput = z.input<typeof budgetLookupSchema>;

export const listBudgetsSchema = z.object({
  actorUserId: userIdSchema,
  /** Filter budgets to a single category. */
  categoryId: uuidSchema.optional(),
  includeArchived: z.boolean().optional().default(false),
});

export type ListBudgetsInput = z.input<typeof listBudgetsSchema>;

// -------------------------------------------------------------------
// Periods
// -------------------------------------------------------------------

export const budgetPeriodLookupSchema = z.object({
  actorUserId: userIdSchema,
  budgetId: uuidSchema,
  periodStart: dateSchema,
});

export type BudgetPeriodLookupInput = z.input<typeof budgetPeriodLookupSchema>;
