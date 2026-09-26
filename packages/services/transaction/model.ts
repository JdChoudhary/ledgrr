import { z } from "zod";
import {
  currencyCodeSchema,
  dateSchema,
  moneySchema,
  positiveMoneySchema,
  userIdSchema,
  uuidSchema,
} from "../lib/schema";

/**
 * Input contracts for the transaction service.
 *
 * Transactions are the financial source of truth:
 *   amount > 0, direction comes from `type`, only posted rows matter.
 *
 * Creation is intentionally minimal (type + amount are the only hard
 * requirements — date defaults to today). Accounts are optional: an
 * account-less transaction is still valid for categories, analytics,
 * budgets, splits and debts. A bill split is an allocation layer around
 * the transaction — it never creates a second financial ledger.
 */

// -------------------------------------------------------------------
// Types supported by the manual creation flow
// -------------------------------------------------------------------

export const creatableTransactionTypes = [
  "income",
  "expense",
  "transfer",
  "refund",
] as const;

export type CreatableTransactionType = (typeof creatableTransactionTypes)[number];

// -------------------------------------------------------------------
// Bill split participants
// -------------------------------------------------------------------

/**
 * A participant is either a real user (friend or space member) or one of the
 * creator's contacts (a friend without a Ledgr account), never both.
 *
 * `shareValue` semantics by mode:
 *   equal      -> ignored (computed)
 *   exact      -> the participant's amount (must sum to the transaction amount)
 *   percentage -> 0..100 (must sum to 100)
 *   shares     -> weight > 0 (allocated proportionally)
 */
export const billSplitParticipantInputSchema = z
  .object({
    userId: userIdSchema.nullable().optional(),
    contactId: uuidSchema.nullable().optional(),
    /** Display-only name for ad-hoc participants without a contact record. */
    name: z.string().trim().min(1).max(120).nullable().optional(),
    shareType: z.enum(["equal", "exact", "percentage", "shares"]),
    shareValue: moneySchema().nullable().optional(),
  })
  .refine(
    (v) => (v.userId != null) !== (v.contactId != null),
    { message: "Participant must be either a user or a contact, not both or neither" },
  );

export type BillSplitParticipantInput = z.input<typeof billSplitParticipantInputSchema>;

export const billSplitInputSchema = z
  .object({
    title: z.string().trim().min(1).max(200),
    notes: z.string().trim().max(2000).nullable().optional(),
    participants: z.array(billSplitParticipantInputSchema).min(2).max(50),
  })
  .refine((v) => v.participants.some((p) => p.userId != null), {
    message: "The creator must be included as a participant",
  });

export type BillSplitInput = z.input<typeof billSplitInputSchema>;

// -------------------------------------------------------------------
// Create
// -------------------------------------------------------------------

export const createTransactionInputSchema = z.object({
  spaceId: uuidSchema,
  actorUserId: userIdSchema,

  type: z.enum(creatableTransactionTypes),
  amount: positiveMoneySchema(),

  /** Optional ledger date; defaults to today. */
  date: dateSchema.nullable().optional(),

  /**
   * Optional account. When omitted the transaction still participates in
   * categories/analytics/budgets/splits — it just moves no account balance.
   * Never silently defaulted.
   */
  accountId: uuidSchema.nullable().optional(),
  /** Transfers only. */
  destinationAccountId: uuidSchema.nullable().optional(),

  categoryId: uuidSchema.nullable().optional(),
  merchantId: uuidSchema.nullable().optional(),

  /** Optional; defaults to the space's base currency (rate = 1). */
  currency: currencyCodeSchema.optional(),

  description: z.string().trim().max(2000).nullable().optional(),
  notes: z.string().trim().max(2000).nullable().optional(),

  /** Refunds only: the original income/expense transaction. */
  refundParentId: uuidSchema.nullable().optional(),

  /**
   * Set by the recurring service when an occurrence auto-posts; manual
   * creation never sends it. Links the posted transaction back to its rule.
   */
  recurringRuleId: uuidSchema.nullable().optional(),

  /** Optional allocation layer; produces debts for the other participants. */
  billSplit: billSplitInputSchema.nullable().optional(),
});

export type CreateTransactionInput = z.input<typeof createTransactionInputSchema>;

// -------------------------------------------------------------------
// Read
// -------------------------------------------------------------------

export const transactionLookupSchema = z.object({
  spaceId: uuidSchema,
  actorUserId: userIdSchema,
  transactionId: uuidSchema,
});

export type TransactionLookupInput = z.input<typeof transactionLookupSchema>;

export const deleteTransactionInputSchema = z.object({
  spaceId: uuidSchema,
  actorUserId: userIdSchema,
  transactionId: uuidSchema,
});

export type DeleteTransactionInput = z.input<typeof deleteTransactionInputSchema>;

export const listTransactionsInputSchema = z.object({
  spaceId: uuidSchema,
  actorUserId: userIdSchema,
  accountId: uuidSchema.nullable().optional(),
  type: z.enum(creatableTransactionTypes).optional(),
  status: z.enum(["pending", "posted", "cancelled"]).optional(),
  dateFrom: dateSchema.nullable().optional(),
  dateTo: dateSchema.nullable().optional(),
  /** Tri-state recurring filter: all | recurring only | non-recurring only */
  recurring: z.enum(["all", "recurring", "non_recurring"]).optional().default("all"),
  limit: z.number().int().min(1).max(200).optional().default(50),
  offset: z.number().int().min(0).optional().default(0),
});

export type ListTransactionsInput = z.input<typeof listTransactionsInputSchema>;

// -------------------------------------------------------------------
// Split preview (pure, for the UI's "Split with people" editor)
// -------------------------------------------------------------------

export const splitPreviewInputSchema = z.object({
  amount: positiveMoneySchema(),
  participants: z.array(billSplitParticipantInputSchema).min(2).max(50),
});

export type SplitPreviewInput = z.input<typeof splitPreviewInputSchema>;

/** One allocated share in the transaction currency. */
export type SplitShare = {
  /** Position of the participant in the input array. */
  index: number;
  userId: string | null;
  contactId: string | null;
  name: string | null;
  shareType: "equal" | "exact" | "percentage" | "shares";
  shareValue: string;
  /** The allocated amount in the transaction currency (4 dp). */
  amount: string;
};
