import { z } from "zod";
import { hexColorSchema, positiveMoneySchema, userIdSchema, uuidSchema } from "../lib/schema";
import { budgetPeriodTypeSchema } from "../budget/model";

/**
 * Input contracts for the household service.
 *
 * A household groups people who pool part of their finances. Members keep
 * owning their own categories; they *link* one to a shared household category,
 * and a shared budget on that category aggregates every linked member's spend.
 * Inputs mirror the route layer minus `actorUserId`, which is always taken from
 * the authenticated context.
 */

const householdNameSchema = z.string().trim().min(1).max(80);
const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD");

// -------------------------------------------------------------------
// Household + membership
// -------------------------------------------------------------------

export const createHouseholdInputSchema = z.object({
  actorUserId: userIdSchema,
  name: householdNameSchema,
});

export const householdLookupSchema = z.object({
  actorUserId: userIdSchema,
  householdId: uuidSchema,
});

/** Listing is not household-scoped — it returns everything the actor belongs to. */
export const listHouseholdsInputSchema = z.object({
  actorUserId: userIdSchema,
});

export const householdMemberInputSchema = z.object({
  actorUserId: userIdSchema,
  householdId: uuidSchema,
  userId: userIdSchema,
});

// -------------------------------------------------------------------
// Shared categories
// -------------------------------------------------------------------

export const createHouseholdCategoryInputSchema = z.object({
  actorUserId: userIdSchema,
  householdId: uuidSchema,
  name: householdNameSchema,
  type: z.enum(["income", "expense"]),
  color: hexColorSchema.optional().default("#6B7280"),
  icon: z.string().trim().min(1).max(60).optional().default("tag"),
  sortOrder: z.number().int().min(0).max(1_000_000).optional().default(0),
});

export const listHouseholdCategoriesSchema = z.object({
  actorUserId: userIdSchema,
  householdId: uuidSchema,
  includeArchived: z.boolean().optional().default(false),
});

export const householdCategoryLookupSchema = z.object({
  actorUserId: userIdSchema,
  householdCategoryId: uuidSchema,
});

// -------------------------------------------------------------------
// Category links (personal category → shared category)
// -------------------------------------------------------------------

export const linkHouseholdCategorySchema = z.object({
  actorUserId: userIdSchema,
  householdCategoryId: uuidSchema,
  categoryId: uuidSchema,
});

export const unlinkHouseholdCategorySchema = z.object({
  actorUserId: userIdSchema,
  linkId: uuidSchema,
});

// -------------------------------------------------------------------
// Shared budgets
// -------------------------------------------------------------------

export const createHouseholdBudgetInputSchema = z.object({
  actorUserId: userIdSchema,
  householdCategoryId: uuidSchema,
  periodType: budgetPeriodTypeSchema,
  startsOn: dateOnly,
  endsOn: dateOnly.nullable().optional(),
  limitAmount: positiveMoneySchema(),
  rollover: z.boolean().optional().default(false),
  alertThresholdPercent: z.number().int().min(1).max(100).nullable().optional(),
});

export const listHouseholdBudgetsSchema = z.object({
  actorUserId: userIdSchema,
  householdId: uuidSchema,
});

export const householdBudgetLookupSchema = z.object({
  actorUserId: userIdSchema,
  householdBudgetId: uuidSchema,
});

// -------------------------------------------------------------------
// Inferred types
// -------------------------------------------------------------------

export type CreateHouseholdInput = z.output<typeof createHouseholdInputSchema>;
export type ListHouseholdsInput = z.output<typeof listHouseholdsInputSchema>;
export type HouseholdLookupInput = z.output<typeof householdLookupSchema>;
export type HouseholdMemberInput = z.output<typeof householdMemberInputSchema>;
export type CreateHouseholdCategoryInput = z.output<typeof createHouseholdCategoryInputSchema>;
export type ListHouseholdCategoriesInput = z.output<typeof listHouseholdCategoriesSchema>;
export type HouseholdCategoryLookupInput = z.output<typeof householdCategoryLookupSchema>;
export type LinkHouseholdCategoryInput = z.output<typeof linkHouseholdCategorySchema>;
export type UnlinkHouseholdCategoryInput = z.output<typeof unlinkHouseholdCategorySchema>;
export type CreateHouseholdBudgetInput = z.output<typeof createHouseholdBudgetInputSchema>;
export type ListHouseholdBudgetsInput = z.output<typeof listHouseholdBudgetsSchema>;
export type HouseholdBudgetLookupInput = z.output<typeof householdBudgetLookupSchema>;
