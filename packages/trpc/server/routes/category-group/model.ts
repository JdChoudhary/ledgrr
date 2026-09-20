import { z } from "zod";
import { uuidSchema } from "@repo/services/lib/schema";

const groupName = z.string().trim().min(1).max(80);
const sortOrder = z.number().int().min(0).max(1_000_000);

export const createCategoryGroupSchema = z.object({
  spaceId: uuidSchema,
  name: groupName,
  sortOrder: sortOrder.optional().default(0),
});

export const updateCategoryGroupSchema = z
  .object({
    spaceId: uuidSchema,
    categoryGroupId: uuidSchema,
    name: groupName.optional(),
    sortOrder: sortOrder.optional(),
  })
  .refine((v) => v.name !== undefined || v.sortOrder !== undefined, {
    message: "Provide at least one field to update",
  });

export const categoryGroupLookupSchema = z.object({
  spaceId: uuidSchema,
  categoryGroupId: uuidSchema,
});

export const listCategoryGroupsSchema = z.object({
  spaceId: uuidSchema,
  includeArchived: z.boolean().optional().default(false),
});
