import { z } from "zod";
import { userIdSchema, uuidSchema } from "../lib/schema";

/**
 * Input contracts for the contacts service.
 *
 * A contact is a PRIVATE alias/counterparty owned by one user — e.g. a friend
 * who has never signed up for Ledgr. Contacts never grant ledger access;
 * `linkedUserId` merely links a contact to a real user once that person
 * joins (matched by normalized email or E.164 phone).
 */

/** Free-form phone as typed by the user (stored as-is). */
const phoneSchema = z
  .string()
  .trim()
  .min(3)
  .max(30)
  .regex(/^[+()\-.\s\d]+$/, "Must be a valid phone number");

/** E.164 normalization: strip everything but leading + and digits. */
export const normalizePhoneE164 = (phone: string): string => {
  const trimmed = phone.trim();
  const digits = trimmed.replace(/[^\d]/g, "");
  const hadPlus = trimmed.startsWith("+");
  return `${hadPlus ? "+" : "+"}${digits}`;
};

/** Lower-cased, trimmed email used for unique matching. */
export const normalizeEmail = (email: string): string => email.trim().toLowerCase();

export const createContactInputSchema = z.object({
  actorUserId: userIdSchema,
  name: z.string().trim().min(1).max(120),
  // Email/phone are optional — a name-only contact is still useful as a
  // split participant (§15), it just can't be auto-linked on join.
  email: z.string().trim().email().max(255).optional(),
  phone: phoneSchema.optional(),
});

export type CreateContactInput = z.input<typeof createContactInputSchema>;

export const updateContactInputSchema = z.object({
  actorUserId: userIdSchema,
  contactId: uuidSchema,
  name: z.string().trim().min(1).max(120).optional(),
  email: z.string().trim().email().max(255).optional(),
  phone: phoneSchema.optional(),
});

export type UpdateContactInput = z.input<typeof updateContactInputSchema>;

export const listContactsInputSchema = z.object({
  actorUserId: userIdSchema,
});

export type ListContactsInput = z.input<typeof listContactsInputSchema>;

export const deleteContactInputSchema = z.object({
  actorUserId: userIdSchema,
  contactId: uuidSchema,
});

export type DeleteContactInput = z.input<typeof deleteContactInputSchema>;

/**
 * Manually link a contact to a real user (e.g. the owner recognizes the
 * contact after the person joined). Auto-linking on signup handles the
 * common case; this covers the rest.
 */
export const linkContactInputSchema = z
  .object({
    actorUserId: userIdSchema,
    contactId: uuidSchema,
    linkedUserId: userIdSchema,
  })
  .refine((v) => v.actorUserId !== v.linkedUserId, {
    message: "Cannot link a contact to yourself",
  });

export type LinkContactInput = z.input<typeof linkContactInputSchema>;

/**
 * Called from the auth signup hook: link every existing contact whose
 * normalized email (or E.164 phone) matches the newly-created user.
 */
export const linkContactsForNewUserInputSchema = z.object({
  newUserId: userIdSchema,
  email: z.string().trim().email().optional(),
  phoneE164: z
    .string()
    .trim()
    .regex(/^\+\d{3,25}$/, "Must be an E.164 phone number")
    .optional(),
});

export type LinkContactsForNewUserInput = z.input<typeof linkContactsForNewUserInputSchema>;

/**
 * Directional matching for the friends picker: given a list of user IDs,
 * return which of the actor's contacts are already linked to them.
 */
export const getContactLinksForUsersInputSchema = z.object({
  actorUserId: userIdSchema,
  userIds: z.array(userIdSchema).min(1).max(100),
});

export type GetContactLinksForUsersInput = z.input<typeof getContactLinksForUsersInputSchema>;
