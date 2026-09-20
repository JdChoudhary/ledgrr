import { z } from "zod";
import { uuidSchema } from "@repo/services/lib/schema";

// -------------------------------------------------------------------
// Goal CRUD
// -------------------------------------------------------------------

export const createGoalSchema = z.object({
  spaceId: uuidSchema,
  name: z.string().trim().min(1).max(120),
  targetAmount: z.union([z.number().positive(), z.string().trim().min(1)]),
  currency: z.string().trim().min(3).max(10).optional(),
  targetDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD")
    .nullable()
    .optional(),
  linkedAccountId: uuidSchema.nullable().optional(),
});

export const updateGoalSchema = z
  .object({
    spaceId: uuidSchema,
    goalId: uuidSchema,
    name: z.string().trim().min(1).max(120).optional(),
    targetAmount: z.union([z.number().positive(), z.string().trim().min(1)]).optional(),
    targetDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD")
      .nullable()
      .optional(),
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

export const goalLookupSchema = z.object({
  spaceId: uuidSchema,
  goalId: uuidSchema,
});

export const listGoalsSchema = z.object({
  spaceId: uuidSchema,
  includeArchived: z.boolean().optional().default(false),
});

// -------------------------------------------------------------------
// Contributions — deposit/withdrawal saving
// -------------------------------------------------------------------

export const contributeToGoalSchema = z.object({
  spaceId: uuidSchema,
  goalId: uuidSchema,
  type: z.enum(["deposit", "withdrawal"]),
  amount: z.union([z.number().positive(), z.string().trim().min(1)]),
  accountId: uuidSchema.nullable().optional(),
  note: z.string().trim().max(500).nullable().optional(),
});

export const listGoalContributionsSchema = z.object({
  spaceId: uuidSchema,
  goalId: uuidSchema,
  limit: z.coerce.number().int().min(1).max(200).optional(),
});

export const contributionResultResponseSchema = z.object({
  goalId: z.string(),
  contributionId: z.string(),
  type: z.enum(["deposit", "withdrawal"]),
  amount: z.string(),
  previousSavedAmount: z.string(),
  newSavedAmount: z.string(),
  belowSaved: z.boolean(),
  savedToZero: z.boolean(),
  targetReached: z.boolean(),
});

export const goalContributionResponseSchema = z.object({
  id: z.string(),
  goalId: z.string(),
  spaceId: z.string(),
  userId: z.string(),
  accountId: z.string().nullable(),
  type: z.enum(["deposit", "withdrawal"]),
  amount: z.string(),
  note: z.string().nullable(),
  createdAt: z.date(),
});
