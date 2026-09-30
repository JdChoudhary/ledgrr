import { z } from "zod";
import { hexColorSchema, uuidSchema } from "@repo/services/lib/schema";

// -------------------------------------------------------------------
// Tag CRUD
// -------------------------------------------------------------------

export const createTagSchema = z.object({
  name: z.string().trim().min(1).max(60),
  color: hexColorSchema,
});

export const updateTagSchema = z
  .object({
    tagId: uuidSchema,
    name: z.string().trim().min(1).max(60).optional(),
    color: hexColorSchema.optional(),
  })
  .refine((v) => v.name !== undefined || v.color !== undefined, {
    message: "Provide at least one field to update",
  });

export const tagLookupSchema = z.object({
  tagId: uuidSchema,
});

export const listTagsSchema = z.object({
  includeArchived: z.boolean().optional().default(false),
});

// -------------------------------------------------------------------
// Attach / Detach
// -------------------------------------------------------------------

export const attachTagSchema = z.object({
  transactionId: uuidSchema,
  tagId: uuidSchema,
});

export const detachTagSchema = z.object({
  transactionId: uuidSchema,
  tagId: uuidSchema,
});

export const listTransactionTagsSchema = z.object({
  transactionId: uuidSchema,
});
