import { z } from "zod";
import { userIdSchema, uuidSchema } from "@repo/services/lib/schema";

// -------------------------------------------------------------------
// Inputs
// -------------------------------------------------------------------

export const createContactSchema = z.object({
  name: z.string().trim().min(1).max(120),
  // Optional — name-only contacts are valid (custom friends for splits);
  // without email/phone they simply can't be auto-linked when they join.
  email: z.string().trim().email().max(255).optional(),
  phone: z
    .string()
    .trim()
    .min(3)
    .max(30)
    .regex(/^[+()\-.\s\d]+$/, "Must be a valid phone number")
    .optional(),
});

export const updateContactSchema = z.object({
  contactId: uuidSchema,
  name: z.string().trim().min(1).max(120).optional(),
  email: z.string().trim().email().max(255).optional(),
  phone: z
    .string()
    .trim()
    .min(3)
    .max(30)
    .regex(/^[+()\-.\s\d]+$/, "Must be a valid phone number")
    .optional(),
});

export const contactIdSchema = z.object({
  contactId: uuidSchema,
});

export const linkContactSchema = z.object({
  contactId: uuidSchema,
  linkedUserId: userIdSchema,
});

// -------------------------------------------------------------------
// Outputs
// -------------------------------------------------------------------

export const contactSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  /** Set when the person behind this contact joined Ledgr. */
  linkedUserId: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const personResultSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("user"),
    id: z.string(),
    name: z.string(),
    email: z.string().nullable(),
    image: z.string().nullable(),
    username: z.string().nullable(),
    linkedUserId: z.null(),
  }),
  z.object({
    kind: z.literal("contact"),
    id: z.string().uuid(),
    name: z.string(),
    email: z.string().nullable(),
    image: z.null(),
    username: z.null(),
    linkedUserId: z.string().nullable(),
  }),
]);
