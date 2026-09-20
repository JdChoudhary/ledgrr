import { z } from "zod";
import { hexColorSchema, uuidSchema } from "@repo/services/lib/schema";

// -------------------------------------------------------------------
// Tag CRUD
// -------------------------------------------------------------------

export const createTagSchema = z.object({
  spaceId: uuidSchema,
  name: z.string().trim().min(1).max(60),
  color: hexColorSchema,
});

export const updateTagSchema = z
  .object({
    spaceId: uuidSchema,
    tagId: uuidSchema,
    name: z.string().trim().min(1).max(60).optional(),
    color: hexColorSchema.optional(),
  })
  .refine((v) => v.name !== undefined || v.color !== undefined, {
    message: "Provide at least one field to update",
  });

export const tagLookupSchema = z.object({
  spaceId: uuidSchema,
  tagId: uuidSchema,
});

export const listTagsSchema = z.object({
  spaceId: uuidSchema,
  includeArchived: z.boolean().optional().default(false),
});

// -------------------------------------------------------------------
// Attach / Detach
// -------------------------------------------------------------------

export const attachTagSchema = z.object({
  spaceId: uuidSchema,
  transactionId: uuidSchema,
  tagId: uuidSchema,
});

export const detachTagSchema = z.object({
  spaceId: uuidSchema,
  transactionId: uuidSchema,
  tagId: uuidSchema,
});

export const listTransactionTagsSchema = z.object({
  spaceId: uuidSchema,
  transactionId: uuidSchema,
});
