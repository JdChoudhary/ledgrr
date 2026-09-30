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
 * Input contracts for the debt service.
 *
 * A debt is an outstanding obligation (receivable/payable) — never income and
 * never expense. It can stand alone between two parties or originate from a
 * bill split. Settlements (debt payments) reduce the outstanding amount;
 * `paid_amount` must always equal SUM(debt_payments.amount).
 *
 * Identity rules (mirrored by DB CHECKs):
 *   - each side is exactly one identity: a real user XOR a contact
 *   - at least one side must be a real user
 *   - self-debt between two users is forbidden
 *
 * Multiple debts between the same pair are allowed; net balances are derived
 * by the caller — individual obligations are never merged/destroyed.
 */

export const debtPartyInputSchema = z.object({
  userId: userIdSchema.nullable().optional(),
  contactId: uuidSchema.nullable().optional(),
  /** Display-only name for ad-hoc counterparties without a contact record. */
  name: z.string().trim().min(1).max(120).nullable().optional(),
});

export type DebtPartyInput = z.input<typeof debtPartyInputSchema>;

// -------------------------------------------------------------------
// Create
// -------------------------------------------------------------------

export const createDebtInputSchema = z
  .object({
    actorUserId: userIdSchema,

    /** Who is owed (receivable holder). */
    creditor: debtPartyInputSchema,
    /** Who owes (obligor). */
    debtor: debtPartyInputSchema,

    amount: positiveMoneySchema(),
    currency: currencyCodeSchema,
    dueDate: dateSchema.nullable().optional(),
    notes: z.string().trim().max(2000).nullable().optional(),
  })
  .refine((v) => (v.creditor.userId != null) !== (v.creditor.contactId != null), {
    message: "Creditor must be either a user or a contact, not both or neither",
  })
  .refine((v) => (v.debtor.userId != null) !== (v.debtor.contactId != null), {
    message: "Debtor must be either a user or a contact, not both or neither",
  });

export type CreateDebtInput = z.input<typeof createDebtInputSchema>;

// -------------------------------------------------------------------
// Read
// -------------------------------------------------------------------

export const listDebtsInputSchema = z.object({
  actorUserId: userIdSchema,
  /**
   * Direction filter:
   *   owed_to_me  -> actor is the creditor (receivables)
   *   i_owe       -> actor is the debtor (payables)
   *   all         -> both (default)
   */
  direction: z.enum(["owed_to_me", "i_owe", "all"]).optional().default("all"),
  /** Filter to one counterparty user. */
  counterpartyUserId: userIdSchema.nullable().optional(),
  status: z.enum(["open", "partially_settled", "settled", "cancelled"]).optional(),
  limit: z.number().int().min(1).max(200).optional().default(100),
});

export type ListDebtsInput = z.input<typeof listDebtsInputSchema>;

// -------------------------------------------------------------------
// Settlement
// -------------------------------------------------------------------

export const settleDebtInputSchema = z.object({
  actorUserId: userIdSchema,
  debtId: uuidSchema,
  amount: positiveMoneySchema(),
  /** Optional ledger date; defaults to today. */
  paidOn: dateSchema.nullable().optional(),
  notes: z.string().trim().max(2000).nullable().optional(),
});

export type SettleDebtInput = z.input<typeof settleDebtInputSchema>;

export const cancelDebtInputSchema = z.object({
  actorUserId: userIdSchema,
  debtId: uuidSchema,
});

export type CancelDebtInput = z.input<typeof cancelDebtInputSchema>;

// -------------------------------------------------------------------
// Mutual settlement (netting)
// -------------------------------------------------------------------

/**
 * Cancels out mutual obligations between the actor and one counterparty: the
 * offsetting `amount` is applied as *paired* settlements — once against each
 * debt the counterparty owes the actor and once against each debt the actor
 * owes the counterparty — so the net balance is preserved while the overlap
 * disappears from both sides.
 */
export const settleMutualInputSchema = z.object({
  actorUserId: userIdSchema,
  counterpartyUserId: userIdSchema,
  amount: positiveMoneySchema(),
  /** Optional ledger date; defaults to today. */
  paidOn: dateSchema.nullable().optional(),
  notes: z.string().trim().max(2000).nullable().optional(),
});

export type SettleMutualInput = z.input<typeof settleMutualInputSchema>;

// -------------------------------------------------------------------
// Shared bits
// -------------------------------------------------------------------

/** Derived lifecycle status kept in sync with the service response shape. */
export const debtStatusSchema = z.enum(["open", "partially_settled", "settled", "cancelled"]);

/** Balance summary for a counterparty, derived on the fly (never stored). */
export const counterpartyBalanceSchema = z.object({
  counterpartyUserId: userIdSchema,
  /** Total they owe the actor. */
  theyOwe: moneySchema(),
  /** Total the actor owes them. */
  owedByMe: moneySchema(),
  /** theyOwe - owedByMe, signed. */
  net: z.string(),
});

export type CounterpartyBalance = z.output<typeof counterpartyBalanceSchema>;
