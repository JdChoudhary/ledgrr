import { z } from "zod";
import { uuidSchema } from "@repo/services/lib/schema";
import { budgetPeriodTypeSchema } from "@repo/services/budget/model";

/**
 * Route-level contracts for the household router.
 *
 * Mirrors the household service schemas minus `actorUserId` (always taken from
 * the authenticated context, never from the client).
 */

const householdNameSchema = z.string().trim().min(1).max(80);
const colorSchema = z
  .string()
  .trim()
  .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, "Must be a hex color like #4F46E5");
const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD");

const decimalPattern = /^(?!0+(\.0+)?$)\d+(\.\d{1,4})?$/;
const positiveMoney = z
  .union([z.number().positive(), z.string().trim().regex(decimalPattern)])
  .transform((v) => Number(v).toFixed(4));

// -------------------------------------------------------------------
// Inputs
// -------------------------------------------------------------------

export const createHouseholdSchema = z.object({
  name: householdNameSchema,
});

export const householdLookupSchema = z.object({
  householdId: uuidSchema,
});

export const householdMemberSchema = z.object({
  householdId: uuidSchema,
  userId: z.string().trim().min(1).max(255),
});

export const createHouseholdCategorySchema = z.object({
  householdId: uuidSchema,
  name: householdNameSchema,
  type: z.enum(["income", "expense"]),
  color: colorSchema.optional().default("#6B7280"),
  icon: z.string().trim().min(1).max(60).optional().default("tag"),
  sortOrder: z.number().int().min(0).max(1_000_000).optional().default(0),
});

export const listHouseholdCategoriesSchema = z.object({
  householdId: uuidSchema,
  includeArchived: z.boolean().optional().default(false),
});

export const householdCategoryLookupSchema = z.object({
  householdCategoryId: uuidSchema,
});

export const linkHouseholdCategorySchema = z.object({
  householdCategoryId: uuidSchema,
  categoryId: uuidSchema,
});

export const unlinkHouseholdCategorySchema = z.object({
  linkId: uuidSchema,
});

export const createHouseholdBudgetSchema = z.object({
  householdCategoryId: uuidSchema,
  periodType: budgetPeriodTypeSchema,
  startsOn: dateOnly,
  endsOn: dateOnly.nullable().optional(),
  limitAmount: positiveMoney,
  rollover: z.boolean().optional().default(false),
  alertThresholdPercent: z.number().int().min(1).max(100).nullable().optional(),
});

export const listHouseholdBudgetsSchema = z.object({
  householdId: uuidSchema,
});

export const householdBudgetLookupSchema = z.object({
  householdBudgetId: uuidSchema,
});

// -------------------------------------------------------------------
// Outputs
// -------------------------------------------------------------------

export const householdRoleSchema = z.enum(["owner", "member"]);

export const householdResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  createdBy: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const householdSummarySchema = z.object({
  household: householdResponseSchema,
  role: householdRoleSchema,
  memberCount: z.number().int(),
});

export const householdMemberResponseSchema = z.object({
  id: z.string(),
  userId: z.string(),
  role: householdRoleSchema,
  joinedAt: z.date(),
  name: z.string(),
  email: z.string(),
  image: z.string().nullable(),
});

export const householdDetailSchema = z.object({
  household: householdResponseSchema,
  role: householdRoleSchema,
  members: z.array(householdMemberResponseSchema),
});

export const householdCategoryResponseSchema = z.object({
  id: z.string(),
  householdId: z.string(),
  createdBy: z.string(),
  name: z.string(),
  type: z.string(),
  color: z.string(),
  icon: z.string(),
  sortOrder: z.number(),
  archivedAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const householdCategoryLinkResponseSchema = z.object({
  id: z.string(),
  householdCategoryId: z.string(),
  userId: z.string(),
  categoryId: z.string(),
  createdAt: z.date(),
});

/** Links enriched with the member's own category name/colour, for display. */
export const householdCategoryLinkDetailSchema = z.object({
  id: z.string(),
  householdCategoryId: z.string(),
  userId: z.string(),
  categoryId: z.string(),
  categoryName: z.string(),
  categoryColor: z.string(),
});

export const householdBudgetResponseSchema = z.object({
  id: z.string(),
  householdId: z.string(),
  householdCategoryId: z.string(),
  createdBy: z.string(),
  periodType: z.string(),
  startsOn: z.string(),
  endsOn: z.string().nullable(),
  limitAmount: z.string(),
  rollover: z.boolean(),
  alertThresholdPercent: z.number().nullable(),
  archivedAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

/** One member's contribution to a shared budget for the current period. */
export const householdMemberSpendSchema = z.object({
  userId: z.string(),
  name: z.string(),
  email: z.string(),
  image: z.string().nullable(),
  linked: z.boolean(),
  spend: z.string(),
});

export const householdBudgetStatusSchema = z.object({
  householdBudgetId: z.string(),
  period: z
    .object({
      periodStart: z.string(),
      periodEnd: z.string(),
      limitAmount: z.string(),
    })
    .nullable(),
  liveSpend: z.string(),
  remaining: z.string(),
  percentUsed: z.number(),
  state: z.enum(["on_track", "warning", "over"]),
  members: z.array(householdMemberSpendSchema),
});

/**
 * Per-person expense for one shared category over its display window (its
 * active budget period when it has one, otherwise the calendar month).
 */
export const householdCategorySpendSchema = z.object({
  householdCategoryId: z.string(),
  periodStart: z.string(),
  periodEnd: z.string(),
  total: z.string(),
  members: z.array(householdMemberSpendSchema),
});
