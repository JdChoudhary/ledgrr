import { z } from "zod";
import { uuidSchema } from "@repo/services/lib/schema";

/**
 * Input/output contracts for the transaction router.
 *
 * Mirrors the transaction service: minimal creation (type + amount), optional
 * account, optional description, optional bill split allocation.
 */

// -------------------------------------------------------------------
// Shared primitives (same scale as the service schemas)
// -------------------------------------------------------------------

const decimalPattern = /^\d+(\.\d{1,4})?$/;
const positiveDecimalPattern = /^(?!0+(\.0+)?$)\d+(\.\d{1,4})?$/;

const money = z
  .union([z.number().nonnegative(), z.string().trim().regex(decimalPattern)])
  .transform((v) => Number(v).toFixed(4));

const positiveMoney = z
  .union([z.number().positive(), z.string().trim().regex(positiveDecimalPattern)])
  .transform((v) => Number(v).toFixed(4));

const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be a YYYY-MM-DD date");

const transactionTypeSchema = z.enum(["income", "expense", "transfer", "refund"]);

// -------------------------------------------------------------------
// Split participants (allocation layer — never a second ledger)
// -------------------------------------------------------------------

export const splitParticipantInputSchema = z
  .object({
    userId: z.string().trim().min(1).max(255).nullable().optional(),
    contactId: uuidSchema.nullable().optional(),
    name: z.string().trim().min(1).max(120).nullable().optional(),
    shareType: z.enum(["equal", "exact", "percentage", "shares"]),
    shareValue: money.nullable().optional(),
  })
  .refine((v) => (v.userId != null) !== (v.contactId != null), {
    message: "Participant must be either a user or a contact, not both or neither",
  });

export type SplitParticipantInput = z.output<typeof splitParticipantInputSchema>;

export const billSplitInputSchema = z
  .object({
    title: z.string().trim().min(1).max(200),
    notes: z.string().trim().max(2000).nullable().optional(),
    participants: z.array(splitParticipantInputSchema).min(2).max(50),
  })
  .refine((v) => v.participants.some((p) => p.userId != null), {
    message: "The transaction creator must be included as a participant",
  });

export type BillSplitInput = z.output<typeof billSplitInputSchema>;

// -------------------------------------------------------------------
// Inputs
// -------------------------------------------------------------------

export const createTransactionSchema = z.object({
  spaceId: uuidSchema,
  type: transactionTypeSchema,
  amount: positiveMoney,
  date: dateOnly.nullable().optional(),
  accountId: uuidSchema.nullable().optional(),
  destinationAccountId: uuidSchema.nullable().optional(),
  categoryId: uuidSchema.nullable().optional(),
  merchantId: uuidSchema.nullable().optional(),
  currency: z.string().trim().min(3).max(10).optional(),
  description: z.string().trim().max(2000).nullable().optional(),
  notes: z.string().trim().max(2000).nullable().optional(),
  refundParentId: uuidSchema.nullable().optional(),
  billSplit: billSplitInputSchema.nullable().optional(),
});

export type CreateTransactionInput = z.output<typeof createTransactionSchema>;

export const transactionLookupSchema = z.object({
  spaceId: uuidSchema,
  transactionId: uuidSchema,
});

export const deleteTransactionSchema = z.object({
  spaceId: uuidSchema,
  transactionId: uuidSchema,
});

export const listTransactionsSchema = z.object({
  spaceId: uuidSchema,
  accountId: uuidSchema.nullable().optional(),
  type: transactionTypeSchema.optional(),
  status: z.enum(["pending", "posted", "cancelled"]).optional(),
  dateFrom: dateOnly.nullable().optional(),
  dateTo: dateOnly.nullable().optional(),
  limit: z.number().int().min(1).max(200).optional().default(50),
  offset: z.number().int().min(0).optional().default(0),
});

export const splitPreviewSchema = z.object({
  amount: positiveMoney,
  participants: z.array(splitParticipantInputSchema).min(2).max(50),
});

// -------------------------------------------------------------------
// Outputs (OpenAPI)
// -------------------------------------------------------------------

export const transactionResponseSchema = z.object({
  id: z.string(),
  spaceId: z.string(),
  createdBy: z.string(),
  accountId: z.string().nullable(),
  destinationAccountId: z.string().nullable(),
  categoryId: z.string().nullable(),
  merchantId: z.string().nullable(),
  refundParentId: z.string().nullable(),
  billSplitId: z.string().nullable(),
  amount: z.string(),
  personalAmount: z.string(),
  currency: z.string(),
  baseCurrency: z.string(),
  amountInBaseCurrency: z.string(),
  type: z.enum([
    "income",
    "expense",
    "transfer",
    "refund",
    "debt_borrow",
    "debt_lend",
    "debt_collect",
    "debt_payback",
    "adjustment",
  ]),
  status: z.enum(["pending", "posted", "cancelled"]),
  date: z.string(),
  description: z.string().nullable(),
  merchant: z.string().nullable(),
  notes: z.string().nullable(),
  postedAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const splitShareResponseSchema = z.object({
  index: z.number(),
  userId: z.string().nullable(),
  contactId: z.string().nullable(),
  name: z.string().nullable(),
  shareType: z.enum(["equal", "exact", "percentage", "shares"]),
  shareValue: z.string(),
  amount: z.string(),
});
