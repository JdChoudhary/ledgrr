import { z } from "zod";
import { uuidSchema } from "@repo/services/lib/schema";

const categoryName = z.string().trim().min(1).max(80);
const categoryIcon = z.string().trim().min(1).max(60);
const sortOrder = z.number().int().min(0).max(1_000_000);
const hexColor = z
  .string()
  .trim()
  .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, "Must be a hex color like #4F46E5");

export const categoryTypeSchema = z.enum(["income", "expense"]);

// ------------------------------------------------------------------
// CRUD
// ------------------------------------------------------------------

export const createCategorySchema = z.object({
  spaceId: uuidSchema,
  name: categoryName,
  type: categoryTypeSchema,
  groupId: uuidSchema.optional(),
  templateKey: z.string().trim().min(1).max(80).optional(),
  color: hexColor.optional().default("#6B7280"),
  icon: categoryIcon.optional().default("tag"),
  sortOrder: sortOrder.optional().default(0),
});

export const updateCategorySchema = z
  .object({
    spaceId: uuidSchema,
    categoryId: uuidSchema,
    name: categoryName.optional(),
    type: categoryTypeSchema.optional(),
    groupId: uuidSchema.nullable().optional(),
    color: hexColor.optional(),
    icon: categoryIcon.optional(),
    sortOrder: sortOrder.optional(),
  })
  .refine(
    (v) =>
      v.name !== undefined ||
      v.type !== undefined ||
      v.groupId !== undefined ||
      v.color !== undefined ||
      v.icon !== undefined ||
      v.sortOrder !== undefined,
    { message: "Provide at least one field to update" },
  );

export const categoryLookupSchema = z.object({
  spaceId: uuidSchema,
  categoryId: uuidSchema,
});

export const listCategoriesSchema = z.object({
  spaceId: uuidSchema,
  type: categoryTypeSchema.optional(),
  groupId: uuidSchema.optional(),
  includeArchived: z.boolean().optional().default(false),
});

export const mergeCategoriesSchema = z
  .object({
    spaceId: uuidSchema,
    sourceCategoryId: uuidSchema,
    targetCategoryId: uuidSchema,
  })
  .refine((v) => v.sourceCategoryId !== v.targetCategoryId, {
    path: ["targetCategoryId"],
    message: "A category cannot be merged into itself",
  });
