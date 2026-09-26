import { z } from "zod";
import { hexColorSchema, userIdSchema, uuidSchema } from "../lib/schema";

/**
 * Input contracts for the tag service.
 *
 * Tags are lightweight labels attached to transactions.
 * A tag belongs to exactly one user (unique on user_id + lower(name)).
 */

// -------------------------------------------------------------------
// Create
// -------------------------------------------------------------------

export const createTagInputSchema = z.object({
  actorUserId: userIdSchema,
  name: z.string().trim().min(1).max(60),
  color: hexColorSchema,
});

export type CreateTagInput = z.input<typeof createTagInputSchema>;

// -------------------------------------------------------------------
// Update
// -------------------------------------------------------------------

export const updateTagInputSchema = z
  .object({
    actorUserId: userIdSchema,
    tagId: uuidSchema,
    name: z.string().trim().min(1).max(60).optional(),
    color: hexColorSchema.optional(),
  })
  .refine((v) => v.name !== undefined || v.color !== undefined, {
    message: "Provide at least one field to update",
  });

export type UpdateTagInput = z.input<typeof updateTagInputSchema>;

// -------------------------------------------------------------------
// Lookup / List
// -------------------------------------------------------------------

export const tagLookupSchema = z.object({
  actorUserId: userIdSchema,
  tagId: uuidSchema,
});

export type TagLookupInput = z.input<typeof tagLookupSchema>;

export const listTagsSchema = z.object({
  actorUserId: userIdSchema,
  includeArchived: z.boolean().optional().default(false),
});

export type ListTagsInput = z.input<typeof listTagsSchema>;

// -------------------------------------------------------------------
// Attach / Detach
// -------------------------------------------------------------------

export const attachTagToTransactionSchema = z.object({
  actorUserId: userIdSchema,
  transactionId: uuidSchema,
  tagId: uuidSchema,
});

export type AttachTagToTransactionInput = z.input<typeof attachTagToTransactionSchema>;

export const detachTagFromTransactionSchema = z.object({
  actorUserId: userIdSchema,
  transactionId: uuidSchema,
  tagId: uuidSchema,
});

export type DetachTagFromTransactionInput = z.input<typeof detachTagFromTransactionSchema>;

export const listTransactionTagsSchema = z.object({
  actorUserId: userIdSchema,
  transactionId: uuidSchema,
});

export type ListTransactionTagsInput = z.input<typeof listTransactionTagsSchema>;
