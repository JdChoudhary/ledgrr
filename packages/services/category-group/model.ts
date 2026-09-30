import { z } from "zod";
import { userIdSchema, uuidSchema } from "../lib/schema";

/**
 * Input contracts for the category group service.
 *
 * Category groups are a user-scoped, one-level grouping of categories.
 * Names are unique per user (case-insensitive).
 */

const categoryGroupNameSchema = z.string().trim().min(1).max(80);
const sortOrderSchema = z.number().int().min(0).max(1_000_000);

export const createCategoryGroupInputSchema = z.object({
  actorUserId: userIdSchema,
  name: categoryGroupNameSchema,
  sortOrder: sortOrderSchema.optional().default(0),
});

export type CreateCategoryGroupInput = z.input<typeof createCategoryGroupInputSchema>;

export const updateCategoryGroupInputSchema = z
  .object({
    actorUserId: userIdSchema,
    categoryGroupId: uuidSchema,
    name: categoryGroupNameSchema.optional(),
    sortOrder: sortOrderSchema.optional(),
  })
  .refine((value) => value.name !== undefined || value.sortOrder !== undefined, {
    message: "Provide at least one field to update",
  });

export type UpdateCategoryGroupInput = z.input<typeof updateCategoryGroupInputSchema>;

export const categoryGroupLookupInputSchema = z.object({
  actorUserId: userIdSchema,
  categoryGroupId: uuidSchema,
});

export type CategoryGroupLookupInput = z.input<typeof categoryGroupLookupInputSchema>;

export const listCategoryGroupsInputSchema = z.object({
  actorUserId: userIdSchema,
  includeArchived: z.boolean().optional().default(false),
});

export type ListCategoryGroupsInput = z.input<typeof listCategoryGroupsInputSchema>;
