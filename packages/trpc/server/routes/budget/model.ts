import { z } from "zod";
import { uuidSchema } from "@repo/services/lib/schema";
import { budgetPeriodTypeSchema } from "@repo/services/budget/model";

// -------------------------------------------------------------------
// Budget CRUD — category-only association
// -------------------------------------------------------------------

export const createBudgetSchema = z
  .object({
    spaceId: uuidSchema,
    categoryId: uuidSchema,
    periodType: budgetPeriodTypeSchema,
    startsOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD"),
    endsOn: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD")
      .nullable()
      .optional(),
    limitAmount: z.union([z.number().positive(), z.string().trim().min(1)]),
    rollover: z.boolean().optional().default(false),
    alertThresholdPercent: z.number().int().min(1).max(100).nullable().optional(),
  })
  .superRefine((value, ctx) => {
    // A custom budget is a single occurrence — it needs an explicit end date.
    if (value.periodType === "custom" && !value.endsOn) {
      ctx.addIssue({
        code: "custom",
        path: ["endsOn"],
        message: "endsOn is required when periodType is custom",
      });
    }
    if (value.endsOn && value.endsOn < value.startsOn) {
      ctx.addIssue({
        code: "custom",
        path: ["endsOn"],
        message: "endsOn must be >= startsOn",
      });
    }
  });

export const updateBudgetSchema = z
  .object({
    spaceId: uuidSchema,
    budgetId: uuidSchema,
    categoryId: uuidSchema.optional(),
    limitAmount: z.union([z.number().positive(), z.string().trim().min(1)]).optional(),
    rollover: z.boolean().optional(),
    alertThresholdPercent: z.number().int().min(1).max(100).nullable().optional(),
    endsOn: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD")
      .nullable()
      .optional(),
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

export const budgetLookupSchema = z.object({
  budgetId: uuidSchema,
  spaceId: uuidSchema,
});

export const listBudgetsSchema = z.object({
  spaceId: uuidSchema,
  categoryId: uuidSchema.optional(),
  includeArchived: z.boolean().optional().default(false),
});

// -------------------------------------------------------------------
// Grouped response — category group → category → budget
// -------------------------------------------------------------------

export const budgetResponseSchema = z.object({
  id: z.string(),
  spaceId: z.string(),
  createdBy: z.string(),
  categoryId: z.string(),
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

const groupedBudgetResponseSchema = z.object({
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
});

export type GroupedBudgetsResponse = z.output<typeof groupedBudgetResponseSchema>;
