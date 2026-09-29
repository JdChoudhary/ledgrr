import { z } from "zod";
import { uuidSchema } from "@repo/services/lib/schema";

/**
 * Route-level contracts for the recurring router.
 *
 * Mirrors the recurring service schemas minus `actorUserId` (always taken
 * from the authenticated context, never from the client).
 */

export const createRuleSchema = z.object({

  type: z.enum(["income", "expense", "transfer"]),
  amount: z.union([z.number().positive(), z.string().trim().min(1)]),
  description: z.string().trim().min(1).max(500),

  schedule: z
    .object({
      frequency: z.enum(["daily", "weekly", "monthly", "yearly"]),
      interval: z.number().int().min(1).max(365),
      dayOfWeek: z.number().int().min(0).max(6).nullable().optional(),
      dayOfMonth: z.number().int().min(1).max(31).nullable().optional(),
    })
    .refine(
      (v) => v.frequency !== "weekly" || v.dayOfWeek != null,
      { message: "A weekly schedule needs a day of week", path: ["dayOfWeek"] },
    )
    .refine(
      (v) => v.frequency !== "monthly" || v.dayOfMonth != null,
      { message: "A monthly schedule needs a day of month", path: ["dayOfMonth"] },
    ),

  accountId: uuidSchema.nullable().optional(),
  destinationAccountId: uuidSchema.nullable().optional(),
  categoryId: uuidSchema.nullable().optional(),
  merchantId: uuidSchema.nullable().optional(),
  currency: z.string().trim().min(3).max(10).optional(),

  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),

  autoPost: z.boolean().nullable().optional(),
  remindDaysBefore: z.number().int().min(0).max(365).nullable().optional(),

  /** Every posted occurrence becomes a bill split with these participants. */
  splitConfig: z
    .object({
      title: z.string().trim().min(1).max(200),
      participants: z
        .array(
          z.object({
            userId: z.string().trim().min(1).nullable().optional(),
            contactId: uuidSchema.nullable().optional(),
            name: z.string().trim().max(120).nullable().optional(),
            shareType: z.enum(["equal", "exact", "percentage", "shares"]),
            shareValue: z.string().trim().nullable().optional(),
          }),
        )
        .min(2)
        .max(50),
    })
    .nullable()
    .optional(),
});

export type CreateRuleRouteInput = z.output<typeof createRuleSchema>;

export const listRulesSchema = z.object({
  status: z.enum(["active", "paused", "completed", "cancelled"]).optional(),
});

// Each route (pause/resume/cancel) pins the target status server-side, so
// the client only sends which rule to act on.
export const ruleStatusSchema = z.object({
  ruleId: uuidSchema,
});

export const ruleLogLookupSchema = z.object({
  ruleId: uuidSchema,
});

// ---------------------------------------------------------------------------
// Outputs
// ---------------------------------------------------------------------------

export const ruleResponseSchema = z.object({
  id: z.string().uuid(),
  // `user.id` is text (Better Auth owns identity) — never a UUID. Validating it
  // as one made output validation throw for every rule, so `recurring.list`
  // returned nothing and `recurring.create` failed after inserting the row.
  userId: z.string(),
  createdBy: z.string(),
  accountId: z.string().nullable(),
  destinationAccountId: z.string().nullable(),
  categoryId: z.string().nullable(),
  merchantId: z.string().nullable(),
  type: z.enum(["income", "expense", "transfer"]),
  amountMode: z.enum(["fixed", "variable"]),
  amount: z.string(),
  currency: z.string(),
  description: z.string(),
  frequency: z.enum(["daily", "weekly", "monthly", "yearly"]),
  interval: z.number().int(),
  dayOfWeek: z.number().int().nullable(),
  dayOfMonth: z.number().int().nullable(),
  autoPost: z.boolean(),
  remindDaysBefore: z.number().int().nullable(),
  splitConfig: z
    .object({
      title: z.string(),
      participants: z.array(
        z.object({
          userId: z.string().nullable(),
          contactId: z.string().nullable(),
          name: z.string().nullable(),
          shareType: z.enum(["equal", "exact", "percentage", "shares"]),
          shareValue: z.string().nullable(),
        }),
      ),
    })
    .nullable(),
  startDate: z.string(),
  nextRunDate: z.string(),
  endDate: z.string().nullable(),
  status: z.enum(["active", "paused", "completed", "cancelled"]),
  lastRunAt: z.date().nullable(),
});

export const ruleLogResponseSchema = z.object({
  id: z.string().uuid(),
  ruleId: z.string().uuid(),
  transactionId: z.string().nullable(),
  scheduledFor: z.string(),
  status: z.enum(["success", "skipped", "failed"]),
  errorMessage: z.string().nullable(),
});

// -- Occurrences (calendar view) -----------------------------------------------

export const listOccurrencesSchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/),
});

/**
 * A date a rule is *due* to fall on, projected from its schedule. Not a
 * persisted row — `id` is synthetic and there is no transaction or status.
 */
export const projectedOccurrenceResponseSchema = z.object({
  id: z.string(),
  ruleId: z.string().uuid(),
  scheduledFor: z.string(),
  ruleDescription: z.string(),
  ruleAmount: z.string(),
  ruleCurrency: z.string(),
  ruleType: z.enum(["income", "expense", "transfer"]),
  ruleAmountMode: z.enum(["fixed", "variable"]),
  ruleAccountId: z.string().nullable(),
  ruleCategoryId: z.string().nullable(),
  ruleMerchantId: z.string().nullable(),
  ruleFrequency: z.string(),
  ruleInterval: z.number().int(),
});

export const confirmOccurrenceSchema = z.object({
  occurrenceId: uuidSchema,
  amount: z.union([z.number().positive(), z.string().trim().min(1)]),
});

export const skipOccurrenceSchema = z.object({
  occurrenceId: uuidSchema,
  reason: z.string().trim().max(500).optional(),
});

export const occurrenceResponseSchema = z.object({
  id: z.string().uuid(),
  ruleId: z.string().uuid(),
  transactionId: z.string().nullable(),
  scheduledFor: z.string(),
  status: z.enum(["pending", "success", "failed", "skipped", "awaiting_confirmation"]),
  ruleDescription: z.string(),
  ruleAmount: z.string(),
  ruleCurrency: z.string(),
  ruleType: z.enum(["income", "expense", "transfer"]),
  ruleAmountMode: z.enum(["fixed", "variable"]),
  ruleAccountId: z.string().nullable(),
  ruleCategoryId: z.string().nullable(),
  ruleMerchantId: z.string().nullable(),
  ruleFrequency: z.string(),
  ruleInterval: z.number().int(),
});
