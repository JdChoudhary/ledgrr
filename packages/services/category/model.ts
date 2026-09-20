import { z } from "zod";
import { hexColorSchema, userIdSchema, uuidSchema } from "../lib/schema";

/**
 * Input contracts for the category service.
 *
 * Categories are space-scoped. Historical categories are archived rather than
 * deleted, and merged categories keep pointing at the surviving row.
 */

export const categoryTypeSchema = z.enum(["income", "expense"]);

export type CategoryType = z.infer<typeof categoryTypeSchema>;

const categoryNameSchema = z.string().trim().min(1).max(80);
const categoryIconSchema = z.string().trim().min(1).max(60);
const sortOrderSchema = z.number().int().min(0).max(1_000_000);

export const createCategoryInputSchema = z.object({
  spaceId: uuidSchema,
  actorUserId: userIdSchema,
  name: categoryNameSchema,
  type: categoryTypeSchema,
  /** Optional category group in the same space. */
  groupId: uuidSchema.optional(),
  /** Stable key for seeded/template categories; unique per space. */
  templateKey: z.string().trim().min(1).max(80).optional(),
  color: hexColorSchema.optional().default("#6B7280"),
  icon: categoryIconSchema.optional().default("tag"),
  sortOrder: sortOrderSchema.optional().default(0),
});

export type CreateCategoryInput = z.input<typeof createCategoryInputSchema>;

export const updateCategoryInputSchema = z
  .object({
    spaceId: uuidSchema,
    actorUserId: userIdSchema,
    categoryId: uuidSchema,
    name: categoryNameSchema.optional(),
    /**
     * Changing the type of a category that already has transactions is
     * refused: posted financial meaning must not be silently rewritten.
     */
    type: categoryTypeSchema.optional(),
    /** `null` removes the category from its group. */
    groupId: uuidSchema.nullable().optional(),
    color: hexColorSchema.optional(),
    icon: categoryIconSchema.optional(),
    sortOrder: sortOrderSchema.optional(),
  })
  .refine(
    (value) =>
      value.name !== undefined ||
      value.type !== undefined ||
      value.groupId !== undefined ||
      value.color !== undefined ||
      value.icon !== undefined ||
      value.sortOrder !== undefined,
    { message: "Provide at least one field to update" },
  );

export type UpdateCategoryInput = z.input<typeof updateCategoryInputSchema>;

export const categoryLookupInputSchema = z.object({
  spaceId: uuidSchema,
  actorUserId: userIdSchema,
  categoryId: uuidSchema,
});

export type CategoryLookupInput = z.input<typeof categoryLookupInputSchema>;

export const listCategoriesInputSchema = z.object({
  spaceId: uuidSchema,
  actorUserId: userIdSchema,
  type: categoryTypeSchema.optional(),
  groupId: uuidSchema.optional(),
  includeArchived: z.boolean().optional().default(false),
});

export type ListCategoriesInput = z.input<typeof listCategoriesInputSchema>;

export const mergeCategoriesInputSchema = z
  .object({
    spaceId: uuidSchema,
    actorUserId: userIdSchema,
    /** The category that disappears: `merged_into_id` points at the target. */
    sourceCategoryId: uuidSchema,
    /** The surviving category. */
    targetCategoryId: uuidSchema,
  })
  .refine((value) => value.sourceCategoryId !== value.targetCategoryId, {
    path: ["targetCategoryId"],
    message: "A category cannot be merged into itself",
  });

export type MergeCategoriesInput = z.input<typeof mergeCategoriesInputSchema>;
