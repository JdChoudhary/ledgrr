import { and, asc, db, desc, eq, isNull, or, sql } from "@repo/database";
import { contacts, debtPayments, debts, user, type SelectDebt } from "@repo/database/schema";
import { ServiceError, isForeignKeyViolation } from "../lib/errors";
import { recordEvent } from "../analytics";
import { parseInput } from "../lib/schema";
import { assertCurrencyExists } from "../currency";
import {
  cancelDebtInputSchema,
  createDebtInputSchema,
  listDebtsInputSchema,
  settleDebtInputSchema,
  settleMutualInputSchema,
  type CancelDebtInput,
  type CreateDebtInput,
  type ListDebtsInput,
  type SettleDebtInput,
  type SettleMutualInput,
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
  const { actorUserId, creditor, debtor, amount, currency, dueDate, notes } = parseInput(
    createDebtInputSchema,
    input,
    "createDebt input",
  );

  await assertCurrencyExists(currency);

  // Self-debt guard (DB CHECK also enforces the user-vs-user case).
  if (creditor.userId != null && debtor.userId != null && creditor.userId === debtor.userId) {
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

export async function listDebts(input: ListDebtsInput): Promise<ReadonlyArray<DebtListItem>> {
  const { actorUserId, direction, counterpartyUserId, status, limit } = parseInput(
    listDebtsInputSchema,
    input,
    "listDebts input",
  );

  const conditions = [];
  if (direction === "owed_to_me") {
    conditions.push(eq(debts.creditorUserId, actorUserId));
  } else if (direction === "i_owe") {
    conditions.push(eq(debts.debtorUserId, actorUserId));
  } else {
    conditions.push(or(eq(debts.creditorUserId, actorUserId), eq(debts.debtorUserId, actorUserId)));
  }
  if (counterpartyUserId != null) {
    conditions.push(
      or(eq(debts.creditorUserId, counterpartyUserId), eq(debts.debtorUserId, counterpartyUserId)),
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
      const outstanding = Math.max(0, Number(debt.amount) - Number(debt.paidAmount));
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

  const [debt] = await db.select().from(debts).where(eq(debts.id, debtId)).limit(1);

  if (!debt) {
    throw new ServiceError("NOT_FOUND", "Debt not found");
  }

  // Only a real party to the debt may record a settlement. Contacts cannot
  // act, so this is the natural authorization boundary.
  const actorIsParty = debt.creditorUserId === actorUserId || debt.debtorUserId === actorUserId;
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
  const { actorUserId, debtId } = parseInput(cancelDebtInputSchema, input, "cancelDebt input");

  const [debt] = await db.select().from(debts).where(eq(debts.id, debtId)).limit(1);

  if (!debt) {
    throw new ServiceError("NOT_FOUND", "Debt not found");
  }

  const actorIsParty = debt.creditorUserId === actorUserId || debt.debtorUserId === actorUserId;
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

// -------------------------------------------------------------------
// Mutual settlement (netting)
// -------------------------------------------------------------------

export type MutualSettlementResult = {
  /** The offsetting amount applied to both directions. */
  offsetAmount: string;
  /** Currency of the (first) offset — netting pairs same-currency debts only. */
  currency: string;
  /** Every debt whose outstanding amount was reduced. */
  debtIds: string[];
  theyOweAfter: string;
  owedByMeAfter: string;
  netAfter: string;
};

/** Guard against float dust when comparing money as numbers. */
const EPSILON = 0.00005;

/**
 * Cancels out mutual obligations with one counterparty in a single
 * transaction: `amount` is applied as *paired* settlements — once against a
 * debt the counterparty owes the actor and once against a debt the actor
 * owes them — so both directions shrink by the same offset, the overlap
 * disappears, and the net balance is preserved. Only opposing debts in the
 * same currency ever offset each other (FX is out of scope per the base-
 * currency rule). Like every settlement, this touches `debt_payments` only:
 * never transactions, never income/expense analytics.
 */
export async function settleMutualDebts(input: SettleMutualInput): Promise<MutualSettlementResult> {
  const { actorUserId, counterpartyUserId, amount, paidOn, notes } = parseInput(
    settleMutualInputSchema,
    input,
    "settleMutualDebts input",
  );

  if (actorUserId === counterpartyUserId) {
    throw new ServiceError("VALIDATION_ERROR", "You cannot settle mutual debts with yourself");
  }

  const requested = Number(amount);
  const effectiveDate = paidOn ?? today();

  return db.transaction(async (tx): Promise<MutualSettlementResult> => {
    // Same row filter as getCounterpartyBalance, so the mutation can never
    // cancel more (or less) than the balance the user was shown.
    const rows = await tx
      .select()
      .from(debts)
      .where(
        and(
          or(
            and(eq(debts.creditorUserId, actorUserId), eq(debts.debtorUserId, counterpartyUserId)),
            and(eq(debts.creditorUserId, counterpartyUserId), eq(debts.debtorUserId, actorUserId)),
          ),
          isNull(debts.cancelledAt),
        ),
      )
      .orderBy(asc(debts.createdAt));

    const theyOweBefore = rows.reduce(
      (total, debt) =>
        debt.creditorUserId === actorUserId
          ? total + Math.max(0, Number(debt.amount) - Number(debt.paidAmount))
          : total,
      0,
    );
    const owedByMeBefore = rows.reduce(
      (total, debt) =>
        debt.creditorUserId === counterpartyUserId
          ? total + Math.max(0, Number(debt.amount) - Number(debt.paidAmount))
          : total,
      0,
    );

    const open = rows.filter((debt) => Number(debt.paidAmount) < Number(debt.amount) - EPSILON);
    const theyDebts = open.filter((debt) => debt.creditorUserId === actorUserId);
    const iOweDebts = open.filter((debt) => debt.creditorUserId === counterpartyUserId);

    // Capacity is summed per currency: a USD debt never offsets a EUR debt.
    const currencies = [...new Set(open.map((debt) => debt.currency))];
    const outstandingOf = (list: typeof open, currency: string) =>
      list
        .filter((debt) => debt.currency === currency)
        .reduce((total, debt) => total + Number(debt.amount) - Number(debt.paidAmount), 0);

    let capacity = 0;
    for (const currency of currencies) {
      capacity += Math.min(outstandingOf(theyDebts, currency), outstandingOf(iOweDebts, currency));
    }

    if (capacity <= EPSILON) {
      throw new ServiceError("VALIDATION_ERROR", "There are no mutual debts to cancel out");
    }
    if (requested > capacity + EPSILON) {
      throw new ServiceError(
        "VALIDATION_ERROR",
        `Mutual settlement of ${fmtMoney(requested)} exceeds the mutual overlap of ${fmtMoney(capacity)}`,
      );
    }

    const touched = new Set<string>();
    let remaining = requested;
    let appliedCurrency = "";

    /** Applies `value` to one debt: one payment row + the derived balance. */
    const applyPair = async (
      debt: (typeof rows)[number],
      paidBefore: number,
      value: number,
    ): Promise<void> => {
      const newPaid = paidBefore + value;

      await tx.insert(debtPayments).values({
        debtId: debt.id,
        amount: fmtMoney(value),
        currency: debt.currency,
        paidAt: effectiveDate,
        notes: notes ?? "Mutual offset",
      });

      const [updated] = await tx
        .update(debts)
        .set({
          paidAmount: fmtMoney(newPaid),
          settledAt: newPaid >= Number(debt.amount) - EPSILON ? new Date() : null,
        })
        .where(eq(debts.id, debt.id))
        .returning({ id: debts.id });

      if (!updated) {
        throw new ServiceError("INVALID_STATE", "Failed to record mutual settlement");
      }
      touched.add(debt.id);
    };

    // Greedy two-pointer walk: pair each receivable against each payable in
    // the same currency until the requested offset is exhausted.
    for (const currency of currencies) {
      if (remaining <= EPSILON) break;

      const theyQueue = theyDebts.filter((debt) => debt.currency === currency);
      const iOweQueue = iOweDebts.filter((debt) => debt.currency === currency);

      let i = 0;
      let j = 0;
      let theyPaid = i < theyQueue.length ? Number(theyQueue[i]?.paidAmount ?? 0) : 0;
      let theyLeft = i < theyQueue.length ? Number(theyQueue[i]?.amount ?? 0) - theyPaid : 0;
      let iOwePaid = j < iOweQueue.length ? Number(iOweQueue[j]?.paidAmount ?? 0) : 0;
      let iOweLeft = j < iOweQueue.length ? Number(iOweQueue[j]?.amount ?? 0) - iOwePaid : 0;

      while (remaining > EPSILON && i < theyQueue.length && j < iOweQueue.length) {
        const pair = Math.min(theyLeft, iOweLeft, remaining);
        if (pair <= EPSILON) break;

        const theyDebt = theyQueue[i];
        const iOweDebt = iOweQueue[j];
        if (!theyDebt || !iOweDebt) break;

        if (!appliedCurrency) appliedCurrency = currency;
        await applyPair(theyDebt, theyPaid, pair);
        await applyPair(iOweDebt, iOwePaid, pair);

        remaining -= pair;
        theyPaid += pair;
        theyLeft -= pair;
        iOwePaid += pair;
        iOweLeft -= pair;

        if (theyLeft <= EPSILON) {
          i += 1;
          const next = theyQueue[i];
          theyPaid = next ? Number(next.paidAmount) : 0;
          theyLeft = next ? Number(next.amount) - theyPaid : 0;
        }
        if (iOweLeft <= EPSILON) {
          j += 1;
          const next = iOweQueue[j];
          iOwePaid = next ? Number(next.paidAmount) : 0;
          iOweLeft = next ? Number(next.amount) - iOwePaid : 0;
        }
      }
    }

    if (remaining > EPSILON) {
      // Unreachable: capacity was validated above. Guard so a partial offset
      // can never commit.
      throw new ServiceError("INVALID_STATE", "Could not cancel out the full amount");
    }

    const theyOweAfter = Math.max(0, theyOweBefore - requested);
    const owedByMeAfter = Math.max(0, owedByMeBefore - requested);

    return {
      offsetAmount: fmtMoney(requested),
      // Always set: capacity > 0 guarantees at least one applied pair.
      currency: appliedCurrency || rows[0]?.currency || "",
      debtIds: [...touched],
      theyOweAfter: fmtMoney(theyOweAfter),
      owedByMeAfter: fmtMoney(owedByMeAfter),
      netAfter: fmtMoney(theyOweAfter - owedByMeAfter),
    };
  });
}
