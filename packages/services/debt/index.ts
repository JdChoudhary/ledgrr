import { and, db, desc, eq, or, sql } from "@repo/database";
import {
  contacts,
  debtPayments,
  debts,
  user,
  type SelectDebt,
} from "@repo/database/schema";
import { ServiceError, isForeignKeyViolation } from "../lib/errors";
import { recordEvent } from "../analytics";
import { parseInput } from "../lib/schema";
import { assertCurrencyExists } from "../space";
import {
  cancelDebtInputSchema,
  createDebtInputSchema,
  listDebtsInputSchema,
  settleDebtInputSchema,
  type CancelDebtInput,
  type CreateDebtInput,
  type ListDebtsInput,
  type SettleDebtInput,
} from "./model";

/**
 * Debt service.
 *
 * A debt is an outstanding obligation between two parties — never income,
 * never expense. Settlements reduce the outstanding amount and must never
 * inflate income/expense analytics: `debt_payments` rows are the settlement
 * ledger, and no `transactions` rows are created here.
 *
 *   open            paidAmount = 0
 *   partially_settled  0 < paidAmount < amount
 *   settled         paidAmount = amount (immutable thereafter)
 *   cancelled       cancelledAt set (no further settlements)
 *
 * Multiple debts between the same pair are preserved; net balances are
 * derived, never stored on the friend/contact record.
 */

const fmtMoney = (value: string | number): string => Number(value).toFixed(4);
const today = (): string => new Date().toISOString().slice(0, 10);

// -------------------------------------------------------------------
// Enriched list row
// -------------------------------------------------------------------

export type DebtListItem = {
  debt: SelectDebt;
  status: "open" | "partially_settled" | "settled" | "cancelled";
  outstandingAmount: string;
  /** Resolved display names for the two sides. */
  creditorName: string;
  debtorName: string;
};

const resolvePartyName = async (
  userId: string | null,
  contactId: string | null,
): Promise<string> => {
  if (userId != null) {
    const [row] = await db
      .select({ name: user.name, username: user.username })
      .from(user)
      .where(eq(user.id, userId))
      .limit(1);
    if (row) return row.username ?? row.name;
  }
  if (contactId != null) {
    const [row] = await db
      .select({ name: contacts.name })
      .from(contacts)
      .where(eq(contacts.id, contactId))
      .limit(1);
    if (row) return row.name;
  }
  return "Unknown";
};

// -------------------------------------------------------------------
// Create
// -------------------------------------------------------------------

export async function createDebt(input: CreateDebtInput): Promise<SelectDebt> {
  const { actorUserId, creditor, debtor, amount, currency, dueDate, notes } =
    parseInput(createDebtInputSchema, input, "createDebt input");

  await assertCurrencyExists(currency);

  // Self-debt guard (DB CHECK also enforces the user-vs-user case).
  if (
    creditor.userId != null &&
    debtor.userId != null &&
    creditor.userId === debtor.userId
  ) {
    throw new ServiceError("VALIDATION_ERROR", "A debt cannot have the same person on both sides");
  }

  // At least one side must be a real user (DB CHECK mirrors this).
  if (creditor.userId == null && debtor.userId == null) {
    throw new ServiceError("VALIDATION_ERROR", "At least one side of a debt must be a real user");
  }

  // When the actor is not a party, the debt must reference the actor as a
  // real user on at least one side — otherwise anyone could fabricate debts
  // between arbitrary third parties.
  const actorIsParty = creditor.userId === actorUserId || debtor.userId === actorUserId;
  if (!actorIsParty) {
    throw new ServiceError("FORBIDDEN", "You can only create debts you are a party to");
  }

  try {
    const [debt] = await db
      .insert(debts)
      .values({
        createdBy: actorUserId,
        creditorUserId: creditor.userId ?? null,
        creditorContactId: creditor.contactId ?? null,
        debtorUserId: debtor.userId ?? null,
        debtorContactId: debtor.contactId ?? null,
        sourceType: "direct",
        amount: fmtMoney(amount),
        paidAmount: "0.0000",
        currency,
        dueDate: dueDate ?? null,
        notes: notes ?? null,
      })
      .returning();

    if (!debt) {
      throw new ServiceError("INVALID_STATE", "Failed to create debt");
    }
    await recordEvent({
      actorUserId,
      eventName: "debt_created",
      eventCategory: "debt",
      entityType: "debt",
      entityId: debt.id,
      properties: { amount: debt.amount, currency: debt.currency },
      idempotencyKey: `debt_created:${debt.id}`,
    });
    return debt;
  } catch (error) {
    if (isForeignKeyViolation(error)) {
      throw new ServiceError("VALIDATION_ERROR", "Unknown contact or user on a debt side");
    }
    throw error;
  }
}

// -------------------------------------------------------------------
// Read
// -------------------------------------------------------------------

export async function listDebts(
  input: ListDebtsInput,
): Promise<ReadonlyArray<DebtListItem>> {
  const {
    actorUserId,
    direction,
    counterpartyUserId,
    status,
    limit,
  } = parseInput(listDebtsInputSchema, input, "listDebts input");

  const conditions = [];
  if (direction === "owed_to_me") {
    conditions.push(eq(debts.creditorUserId, actorUserId));
  } else if (direction === "i_owe") {
    conditions.push(eq(debts.debtorUserId, actorUserId));
  } else {
    conditions.push(
      or(
        eq(debts.creditorUserId, actorUserId),
        eq(debts.debtorUserId, actorUserId),
      ),
    );
  }
  if (counterpartyUserId != null) {
    conditions.push(
      or(
        eq(debts.creditorUserId, counterpartyUserId),
        eq(debts.debtorUserId, counterpartyUserId),
      ),
    );
  }

  const rows = await db
    .select()
    .from(debts)
    .where(and(...conditions))
    .orderBy(desc(debts.createdAt))
    .limit(limit);

  const enriched = await Promise.all(
    rows.map(async (debt): Promise<DebtListItem> => {
      const outstanding = Math.max(
        0,
        Number(debt.amount) - Number(debt.paidAmount),
      );
      let derived: DebtListItem["status"];
      if (debt.cancelledAt != null) {
        derived = "cancelled";
      } else if (Number(debt.paidAmount) >= Number(debt.amount)) {
        derived = "settled";
      } else if (Number(debt.paidAmount) > 0) {
        derived = "partially_settled";
      } else {
        derived = "open";
      }

      const [creditorName, debtorName] = await Promise.all([
        resolvePartyName(debt.creditorUserId, debt.creditorContactId),
        resolvePartyName(debt.debtorUserId, debt.debtorContactId),
      ]);

      return {
        debt,
        status: status ?? derived,
        outstandingAmount: fmtMoney(outstanding),
        creditorName,
        debtorName,
      };
    }),
  );

  // Optional status filter is applied after derivation (status is derived,
  // not stored).
  if (status != null) {
    return enriched.filter((item) => item.status === status);
  }
  return enriched;
}

/** Net balance across ALL debts between the actor and one counterparty. */
export async function getCounterpartyBalance(input: {
  actorUserId: string;
  counterpartyUserId: string;
}): Promise<{ theyOwe: string; owedByMe: string; net: string }> {
  const rows = await db
    .select({
      creditorUserId: debts.creditorUserId,
      debtorUserId: debts.debtorUserId,
      amount: debts.amount,
      paidAmount: debts.paidAmount,
      cancelledAt: debts.cancelledAt,
    })
    .from(debts)
    .where(
      and(
        or(
          and(
            eq(debts.creditorUserId, input.actorUserId),
            eq(debts.debtorUserId, input.counterpartyUserId),
          ),
          and(
            eq(debts.creditorUserId, input.counterpartyUserId),
            eq(debts.debtorUserId, input.actorUserId),
          ),
        ),
        sql`${debts.cancelledAt} IS NULL`,
      ),
    );

  let theyOwe = 0;
  let owedByMe = 0;
  for (const row of rows) {
    const outstanding = Math.max(0, Number(row.amount) - Number(row.paidAmount));
    if (row.creditorUserId === input.actorUserId) {
      theyOwe += outstanding;
    } else {
      owedByMe += outstanding;
    }
  }

  return {
    theyOwe: fmtMoney(theyOwe),
    owedByMe: fmtMoney(owedByMe),
    net: fmtMoney(theyOwe - owedByMe),
  };
}

// -------------------------------------------------------------------
// Settlement
// -------------------------------------------------------------------

export async function settleDebt(input: SettleDebtInput): Promise<SelectDebt> {
  const { actorUserId, debtId, amount, paidOn, notes } = parseInput(
    settleDebtInputSchema,
    input,
    "settleDebt input",
  );

  const [debt] = await db
    .select()
    .from(debts)
    .where(eq(debts.id, debtId))
    .limit(1);

  if (!debt) {
    throw new ServiceError("NOT_FOUND", "Debt not found");
  }

  // Only a real party to the debt may record a settlement. Contacts cannot
  // act, so this is the natural authorization boundary.
  const actorIsParty =
    debt.creditorUserId === actorUserId || debt.debtorUserId === actorUserId;
  if (!actorIsParty) {
    throw new ServiceError("FORBIDDEN", "Only a party of the debt can record a settlement");
  }

  if (debt.cancelledAt != null) {
    throw new ServiceError("INVALID_STATE", "Cancelled debts cannot be settled");
  }
  if (Number(debt.paidAmount) >= Number(debt.amount)) {
    throw new ServiceError("INVALID_STATE", "Debt is already fully settled");
  }

  const outstanding = Number(debt.amount) - Number(debt.paidAmount);
  if (Number(amount) > outstanding) {
    throw new ServiceError(
      "VALIDATION_ERROR",
      `Settlement of ${fmtMoney(amount)} exceeds the outstanding ${fmtMoney(outstanding)}`,
    );
  }

  const effectiveDate = paidOn ?? today();
  const newPaid = Number(debt.paidAmount) + Number(amount);

  try {
    return await db.transaction(async (tx): Promise<SelectDebt> => {
      await tx.insert(debtPayments).values({
        debtId,
        amount: fmtMoney(amount),
        currency: debt.currency,
        paidAt: effectiveDate,
        notes: notes ?? null,
      });

      const [updated] = await tx
        .update(debts)
        .set({
          paidAmount: fmtMoney(newPaid),
          settledAt: newPaid >= Number(debt.amount) ? new Date() : null,
        })
        .where(eq(debts.id, debtId))
        .returning();

      if (!updated) {
        throw new ServiceError("INVALID_STATE", "Failed to settle debt");
      }
      return updated;
    });
  } catch (error) {
    if (isForeignKeyViolation(error)) {
      throw new ServiceError("VALIDATION_ERROR", "Invalid debt reference for payment");
    }
    throw error;
  }
}

export async function cancelDebt(input: CancelDebtInput): Promise<SelectDebt> {
  const { actorUserId, debtId } = parseInput(
    cancelDebtInputSchema,
    input,
    "cancelDebt input",
  );

  const [debt] = await db
    .select()
    .from(debts)
    .where(eq(debts.id, debtId))
    .limit(1);

  if (!debt) {
    throw new ServiceError("NOT_FOUND", "Debt not found");
  }

  const actorIsParty =
    debt.creditorUserId === actorUserId || debt.debtorUserId === actorUserId;
  if (!actorIsParty) {
    throw new ServiceError("FORBIDDEN", "Only a party of the debt can cancel it");
  }

  if (debt.settledAt != null) {
    throw new ServiceError("INVALID_STATE", "Settled debts are immutable and cannot be cancelled");
  }
  if (debt.cancelledAt != null) {
    throw new ServiceError("INVALID_STATE", "Debt is already cancelled");
  }
  if (Number(debt.paidAmount) > 0) {
    throw new ServiceError(
      "INVALID_STATE",
      "Partially settled debts cannot be cancelled; settle the remaining amount instead",
    );
  }

  const [updated] = await db
    .update(debts)
    .set({ cancelledAt: new Date() })
    .where(eq(debts.id, debtId))
    .returning();

  if (!updated) {
    throw new ServiceError("INVALID_STATE", "Failed to cancel debt");
  }
  return updated;
}
