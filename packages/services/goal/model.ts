import { z } from "zod";
import { currencyCodeSchema, dateSchema, moneySchema, positiveMoneySchema, userIdSchema, uuidSchema } from "../lib/schema";

/**
 * Input contracts for the goal service.
 *
 * Goals track savings targets for a user.
 * State is derived: cancelled_at -> cancelled, completed_at -> completed,
 * otherwise active.
 * current_amount is a rebuildable cache.
 */

// -------------------------------------------------------------------
// Create
// -------------------------------------------------------------------

export const createGoalInputSchema = z.object({
  actorUserId: userIdSchema,
  name: z.string().trim().min(1).max(120),
  targetAmount: positiveMoneySchema(),
  currency: currencyCodeSchema.optional(),
  targetDate: dateSchema.nullable().optional(),
  linkedAccountId: uuidSchema.nullable().optional(),
});

export type CreateGoalInput = z.input<typeof createGoalInputSchema>;

// -------------------------------------------------------------------
// Update
// -------------------------------------------------------------------

export const updateGoalInputSchema = z
  .object({
    actorUserId: userIdSchema,
    goalId: uuidSchema,
    name: z.string().trim().min(1).max(120).optional(),
    targetAmount: positiveMoneySchema().optional(),
    targetDate: dateSchema.nullable().optional(),
    linkedAccountId: uuidSchema.nullable().optional(),
  })
  .refine(
    (v) =>
      v.name !== undefined ||
      v.targetAmount !== undefined ||
      v.targetDate !== undefined ||
      v.linkedAccountId !== undefined,
    { message: "Provide at least one field to update" },
  );

export type UpdateGoalInput = z.input<typeof updateGoalInputSchema>;

// -------------------------------------------------------------------
// Lookup / List
// -------------------------------------------------------------------

export const goalLookupSchema = z.object({
  actorUserId: userIdSchema,
  goalId: uuidSchema,
});

export type GoalLookupInput = z.input<typeof goalLookupSchema>;

export const listGoalsSchema = z.object({
  actorUserId: userIdSchema,
  includeArchived: z.boolean().optional().default(false),
});

export type ListGoalsInput = z.input<typeof listGoalsSchema>;

// -------------------------------------------------------------------
// Contributions — deposit/withdrawal saving
// -------------------------------------------------------------------

export const contributeToGoalInputSchema = z.object({
  actorUserId: userIdSchema,
  goalId: uuidSchema,
  type: z.enum(["deposit", "withdrawal"]),
  amount: positiveMoneySchema(),
  accountId: uuidSchema.nullable().optional(),
  note: z.string().trim().max(500).nullable().optional(),
});

export type ContributeToGoalInput = z.input<typeof contributeToGoalInputSchema>;

export const listGoalContributionsInputSchema = z.object({
  actorUserId: userIdSchema,
  goalId: uuidSchema,
  limit: z.number().int().min(1).max(200).optional().default(50),
});

export type ListGoalContributionsInput = z.input<
  typeof listGoalContributionsInputSchema
>;

/**
 * Result of a contribution. `belowSaved` is true when a withdrawal took the
 * goal's saved amount below the amount that had been saved before this
 * contribution — i.e. the user is eating into money they already set aside.
 * This is NOT about falling below the total goal target.
 */
export const contributionResultSchema = z.object({
  goalId: uuidSchema,
  contributionId: uuidSchema,
  type: z.enum(["deposit", "withdrawal"]),
  amount: moneySchema(),
  /** Saved amount before this contribution. */
  previousSavedAmount: moneySchema(),
  /** Saved amount after this contribution. */
  newSavedAmount: moneySchema(),
  /** True when a withdrawal eats into previously-saved money. */
  belowSaved: z.boolean(),
  /** True when a withdrawal reduces saved amount to exactly zero. */
  savedToZero: z.boolean(),
  /** True when a deposit reaches/exceeds the target (goal fully funded). */
  targetReached: z.boolean(),
});

export type ContributionResult = z.output<typeof contributionResultSchema>;
