import { z } from "zod";
import { uuidSchema } from "@repo/services/lib/schema";

/**
 * Input/output contracts for the debt router.
 *
 * Debts are obligations (never income/expense). Settlements reduce the
 * outstanding amount and are recorded in debt_payments only — no transaction
 * rows, no analytics inflation.
 */

const decimalPattern = /^\d+(\.\d{1,4})?$/;
const positiveDecimalPattern = /^(?!0+(\.0+)?$)\d+(\.\d{1,4})?$/;
const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be a YYYY-MM-DD date");

const positiveMoney = z
  .union([z.number().positive(), z.string().trim().regex(positiveDecimalPattern)])
  .transform((v) => Number(v).toFixed(4));

const money = z
  .union([z.number().nonnegative(), z.string().trim().regex(decimalPattern)])
  .transform((v) => Number(v).toFixed(4));

const partySchema = z.object({
  userId: z.string().trim().min(1).max(255).nullable().optional(),
  contactId: uuidSchema.nullable().optional(),
  name: z.string().trim().min(1).max(120).nullable().optional(),
});

// -------------------------------------------------------------------
// Inputs
// -------------------------------------------------------------------

export const createDebtSchema = z
  .object({
    creditor: partySchema,
    debtor: partySchema,
    amount: positiveMoney,
    currency: z.string().trim().min(3).max(10),
    dueDate: dateOnly.nullable().optional(),
    notes: z.string().trim().max(2000).nullable().optional(),
  })
  .refine((v) => (v.creditor.userId != null) !== (v.creditor.contactId != null), {
    message: "Creditor must be either a user or a contact, not both or neither",
  })
  .refine((v) => (v.debtor.userId != null) !== (v.debtor.contactId != null), {
    message: "Debtor must be either a user or a contact, not both or neither",
  });

export type CreateDebtInput = z.output<typeof createDebtSchema>;

export const listDebtsSchema = z.object({
  direction: z.enum(["owed_to_me", "i_owe", "all"]).optional().default("all"),
  counterpartyUserId: z.string().trim().min(1).max(255).nullable().optional(),
  status: z.enum(["open", "partially_settled", "settled", "cancelled"]).optional(),
  limit: z.number().int().min(1).max(200).optional().default(100),
});

export const settleDebtSchema = z.object({
  debtId: uuidSchema,
  amount: positiveMoney,
  paidOn: dateOnly.nullable().optional(),
  notes: z.string().trim().max(2000).nullable().optional(),
});

export const cancelDebtSchema = z.object({
  debtId: uuidSchema,
});

export const settleMutualSchema = z.object({
  counterpartyUserId: z.string().trim().min(1).max(255),
  amount: positiveMoney,
  paidOn: dateOnly.nullable().optional(),
  notes: z.string().trim().max(2000).nullable().optional(),
});

export const counterpartyBalanceSchema = z.object({
  counterpartyUserId: z.string().trim().min(1).max(255),
});

// -------------------------------------------------------------------
// Outputs (OpenAPI)
// -------------------------------------------------------------------

const debtRowSchema = z.object({
  id: z.string(),
  createdBy: z.string(),
  creditorUserId: z.string().nullable(),
  creditorContactId: z.string().nullable(),
  debtorUserId: z.string().nullable(),
  debtorContactId: z.string().nullable(),
  sourceType: z.enum(["direct", "bill_split"]),
  billSplitId: z.string().nullable(),
  amount: z.string(),
  paidAmount: z.string(),
  currency: z.string(),
  dueDate: z.string().nullable(),
  notes: z.string().nullable(),
  settledAt: z.date().nullable(),
  cancelledAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const debtListItemResponseSchema = z.object({
  debt: debtRowSchema,
  status: z.enum(["open", "partially_settled", "settled", "cancelled"]),
  outstandingAmount: z.string(),
  creditorName: z.string(),
  debtorName: z.string(),
});

export const counterpartyBalanceResponseSchema = z.object({
  theyOwe: z.string(),
  owedByMe: z.string(),
  net: z.string(),
});

/** Outcome of cancelling out mutual debts with one counterparty. */
export const mutualSettlementResponseSchema = z.object({
  offsetAmount: z.string(),
  currency: z.string(),
  debtIds: z.array(z.string()),
  theyOweAfter: z.string(),
  owedByMeAfter: z.string(),
  netAfter: z.string(),
});
