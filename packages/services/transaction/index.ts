import { and, db, desc, eq, gte, inArray, lte, sql } from "@repo/database";
import {
  billSplitParticipants,
  billSplits,
  categories,
  debts,
  financialAccounts,
  merchants,
  transactionSplits,
  transactions,
  type SelectTransaction,
  userSettings,
} from "@repo/database/schema";
import {
  ServiceError,
  isCheckViolation,
  isForeignKeyViolation,
} from "../lib/errors";
import { parseInput } from "../lib/schema";
import { assertCurrencyExists } from "../currency";
import { recordEvent } from "../analytics";
import {
  createTransactionInputSchema,
  deleteTransactionInputSchema,
  listTransactionsInputSchema,
  splitPreviewInputSchema,
  transactionLookupSchema,
  type CreateTransactionInput,
  type DeleteTransactionInput,
  type ListTransactionsInput,
  type SplitPreviewInput,
  type SplitShare,
  type TransactionLookupInput,
} from "./model";
import type { CategorySplitInput } from "./model";
import { allocateShares } from "./shares";

/**
 * Transaction service — the financial source of truth.
 *
 *   ACTUAL MONEY MOVEMENT -> Transaction -> optional split -> obligations
 *
 * Creation is minimal: `type` + `amount` are the only hard requirements
 * (date defaults to today). Accounts are optional; an account-less
 * transaction moves no balance but still participates in categories,
 * analytics, budgets, splits and debts.
 *
 * A bill split is an allocation layer around the transaction:
 *   - transaction.amount is unchanged (no double counting)
 *   - participant shares always sum to the transaction amount
 *   - each OTHER participant's share creates one debt owed to the creator
 *   - the creator's own share is their personal expense
 */

const today = (): string => new Date().toISOString().slice(0, 10);

const fmtMoney = (value: string | number): string => Number(value).toFixed(4);

// -------------------------------------------------------------------
// Read helpers
// -------------------------------------------------------------------

const listColumns = {
  id: transactions.id,
  userId: transactions.userId,
  createdBy: transactions.createdBy,
  accountId: transactions.accountId,
  destinationAccountId: transactions.destinationAccountId,
  categoryId: transactions.categoryId,
  merchantId: transactions.merchantId,
  refundParentId: transactions.refundParentId,
  billSplitId: transactions.billSplitId,
  amount: transactions.amount,
  personalAmount: transactions.personalAmount,
  currency: transactions.currency,
  baseCurrency: transactions.baseCurrency,
  amountInBaseCurrency: transactions.amountInBaseCurrency,
  type: transactions.type,
  status: transactions.status,
  date: transactions.date,
  description: transactions.description,
  merchant: transactions.merchant,
  notes: transactions.notes,
  postedAt: transactions.postedAt,
  createdAt: transactions.createdAt,
  updatedAt: transactions.updatedAt,
};

/** One per-category allocation line of a split transaction. */
export type TransactionSplitItem = {
  categoryId: string;
  /** Share of the transaction amount in the transaction currency (4 dp). */
  amount: string;
  note: string | null;
  categoryName: string | null;
  categoryColor: string | null;
};

/** Subset of the transaction row that the API layer exposes. */
export type TransactionListItem = {
  id: string;
  userId: string;
  createdBy: string;
  accountId: string | null;
  destinationAccountId: string | null;
  categoryId: string | null;
  merchantId: string | null;
  refundParentId: string | null;
  billSplitId: string | null;
  amount: string;
  personalAmount: string;
  currency: string;
  baseCurrency: string;
  amountInBaseCurrency: string;
  type: SelectTransaction["type"];
  status: SelectTransaction["status"];
  date: string;
  description: string | null;
  merchant: string | null;
  notes: string | null;
  /** Resolved display names; null when the reference is absent (uncategorized / no account). */
  categoryName: string | null;
  categoryColor: string | null;
  accountName: string | null;
  /** Per-category allocation; empty when the amount is not split. */
  splits: TransactionSplitItem[];
  postedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

const toListItem = (
  row: SelectTransaction,
  refs: { categoryName?: string | null; categoryColor?: string | null; accountName?: string | null } = {},
  splits: TransactionSplitItem[] = [],
): TransactionListItem => ({
  id: row.id,
  userId: row.userId,
  createdBy: row.createdBy,
  accountId: row.accountId,
  destinationAccountId: row.destinationAccountId,
  categoryId: row.categoryId,
  merchantId: row.merchantId,
  refundParentId: row.refundParentId,
  billSplitId: row.billSplitId,
  amount: row.amount,
  personalAmount: row.personalAmount,
  currency: row.currency,
  baseCurrency: row.baseCurrency,
  amountInBaseCurrency: row.amountInBaseCurrency,
  type: row.type,
  status: row.status,
  date: row.date,
  description: row.description,
  merchant: row.merchant,
  notes: row.notes,
  categoryName: refs.categoryName ?? null,
  categoryColor: refs.categoryColor ?? null,
  accountName: refs.accountName ?? null,
  splits,
  postedAt: row.postedAt,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
});

// -------------------------------------------------------------------
// Create
// -------------------------------------------------------------------

export async function createTransaction(
  input: CreateTransactionInput,
): Promise<TransactionListItem> {
  const parsed = parseInput(createTransactionInputSchema, input, "createTransaction input");
  const {
    actorUserId,
    type,
    amount,
    date,
    accountId,
    destinationAccountId,
    categoryId,
    merchantId,
    currency,
    description,
    notes,
    refundParentId,
    billSplit,
    categorySplits,
    recurringRuleId,
  } = parsed;


  const [settings] = await db
    .select({ displayCurrency: userSettings.displayCurrency })
    .from(userSettings)
    .where(eq(userSettings.userId, actorUserId))
    .limit(1);
  const baseCurrency = settings?.displayCurrency ?? "USD";

  const effectiveCurrency = currency ?? baseCurrency;
  await assertCurrencyExists(effectiveCurrency);

  // --- optional references must belong to this user ---------------------
  if (accountId != null) {
    const [account] = await db
      .select({ id: financialAccounts.id })
      .from(financialAccounts)
      .where(
        and(
          eq(financialAccounts.id, accountId),
          eq(financialAccounts.userId, actorUserId),
        ),
      )
      .limit(1);
    if (!account) {
      throw new ServiceError("VALIDATION_ERROR", "Account not found for this user");
    }
  }

  if (destinationAccountId != null) {
    const [destination] = await db
      .select({ id: financialAccounts.id })
      .from(financialAccounts)
      .where(
        and(
          eq(financialAccounts.id, destinationAccountId),
          eq(financialAccounts.userId, actorUserId),
        ),
      )
      .limit(1);
    if (!destination) {
      throw new ServiceError("VALIDATION_ERROR", "Destination account not found for this user");
    }
  }

  if (categoryId != null) {
    const [category] = await db
      .select({ id: categories.id })
      .from(categories)
      .where(and(eq(categories.id, categoryId), eq(categories.userId, actorUserId)))
      .limit(1);
    if (!category) {
      throw new ServiceError("VALIDATION_ERROR", "Category not found for this user");
    }
  }

  if (merchantId != null) {
    const [merchant] = await db
      .select({ id: merchants.id })
      .from(merchants)
      .where(and(eq(merchants.id, merchantId), eq(merchants.userId, actorUserId)))
      .limit(1);
    if (!merchant) {
      throw new ServiceError("VALIDATION_ERROR", "Merchant not found for this user");
    }
  }

  if (refundParentId != null) {
    if (type !== "refund") {
      throw new ServiceError("VALIDATION_ERROR", "refundParentId is only valid for refund transactions");
    }
    const [parent] = await db
      .select({ id: transactions.id, type: transactions.type })
      .from(transactions)
      .where(
        and(
          eq(transactions.id, refundParentId),
          eq(transactions.userId, actorUserId),
        ),
      )
      .limit(1);
    if (!parent) {
      throw new ServiceError("VALIDATION_ERROR", "Refund parent transaction not found for this user");
    }
    if (parent.type !== "expense" && parent.type !== "income") {
      throw new ServiceError("VALIDATION_ERROR", "Refunds can only reference an income or expense transaction");
    }
  } else if (type === "refund") {
    throw new ServiceError("VALIDATION_ERROR", "A refund must reference the original transaction");
  }

  // --- optional per-category allocation --------------------------------
  // Splits replace the single categoryId (the lines ARE the allocation) and
  // are mutually exclusive with bill splits: a bill split divides WHO pays,
  // a category split divides WHAT it was for — combining both would require
  // a two-dimensional allocation matrix.
  let normalizedSplits: CategorySplitInput[] | null = null;
  if (categorySplits != null) {
    if (type === "transfer") {
      throw new ServiceError("VALIDATION_ERROR", "Category splits are not supported on transfers");
    }
    if (categoryId != null) {
      throw new ServiceError(
        "VALIDATION_ERROR",
        "Provide either categoryId or categorySplits, not both",
      );
    }
    if (billSplit != null) {
      throw new ServiceError(
        "VALIDATION_ERROR",
        "A transaction cannot have both a category split and a bill split",
      );
    }

    const categoryIds = categorySplits.map((s) => s.categoryId);
    if (new Set(categoryIds).size !== categoryIds.length) {
      throw new ServiceError("VALIDATION_ERROR", "Category splits contain duplicate categories");
    }

    const splitSum = categorySplits.reduce((acc, s) => acc + Number(s.amount), 0);
    if (Math.abs(splitSum - Number(amount)) > 0.0001) {
      throw new ServiceError(
        "VALIDATION_ERROR",
        `Category splits must sum to the transaction amount (got ${splitSum.toFixed(2)} of ${Number(amount).toFixed(2)})`,
      );
    }

    const owned = await db
      .select({ id: categories.id })
      .from(categories)
      .where(
        and(
          eq(categories.userId, actorUserId),
          inArray(categories.id, categoryIds),
        ),
      );
    if (owned.length !== new Set(categoryIds).size) {
      throw new ServiceError("VALIDATION_ERROR", "One or more split categories not found for this user");
    }

    normalizedSplits = categorySplits;
  }

  // Transfers need both accounts (only type with a hard account requirement).
  if (type === "transfer") {
    if (accountId == null || destinationAccountId == null) {
      throw new ServiceError(
        "VALIDATION_ERROR",
        "A transfer requires both source and destination accounts",
      );
    }
    if (accountId === destinationAccountId) {
      throw new ServiceError("VALIDATION_ERROR", "Transfer source and destination accounts must differ");
    }
  } else if (destinationAccountId != null) {
    throw new ServiceError("VALIDATION_ERROR", "destinationAccountId is only valid for transfers");
  }

  // --- optional split allocation ---------------------------------------
  let splitPlan: {
    title: string;
    notes: string | null;
    shares: SplitShare[];
  } | null = null;

  if (billSplit != null) {
    // Allocation is pure and deterministic; throws when shares do not
    // reconcile with the transaction amount.
    let shares: SplitShare[];
    try {
      shares = allocateShares(amount, billSplit.participants);
    } catch (error) {
      throw new ServiceError(
        "VALIDATION_ERROR",
        error instanceof Error ? error.message : "Invalid split",
      );
    }

    // The creator must be a participant (paid-by anchor) — every other
    // participant owes the creator their share.
    const creatorShare = shares.find((s) => s.userId === actorUserId);
    if (!creatorShare) {
      throw new ServiceError(
        "VALIDATION_ERROR",
        "The transaction creator must be included among the split participants",
      );
    }

    splitPlan = {
      title: billSplit.title,
      notes: billSplit.notes ?? null,
      shares,
    };
  }

  // Personal amount: the creator's own economic share. Without a split it is
  // the full amount; with a split it is the creator's allocated share.
  const personalAmount = splitPlan
    ? (splitPlan.shares.find((s) => s.userId === actorUserId)?.amount ?? amount)
    : amount;

  const effectiveDate = date ?? today();

  try {
    const created = await db.transaction(async (tx): Promise<SelectTransaction> => {
      // 0. Lock affected account rows to prevent concurrent balance reads.
      //    SELECT FOR UPDATE serializes concurrent transactions on the same
      //    account, preventing TOCTOU race conditions on balance validation.
      const accountIds = [accountId, destinationAccountId].filter(
        (id): id is string => id != null,
      );
      if (accountIds.length > 0) {
        const lockedAccounts = await tx
          .select({
            id: financialAccounts.id,
            balance: financialAccounts.balance,
            type: financialAccounts.type,
            creditLimit: financialAccounts.creditLimit,
          })
          .from(financialAccounts)
          .where(
            and(
              eq(financialAccounts.userId, actorUserId),
              inArray(financialAccounts.id, accountIds),
            ),
          )
          .for("update");

        // Validate credit accounts have sufficient limit before proceeding.
        for (const account of lockedAccounts) {
          if (account.type === "credit_card" && type === "expense") {
            const creditLimit = Number(account.creditLimit ?? 0);
            const currentBalance = Number(account.balance);
            const newBalance = currentBalance - Number(amount);
            if (creditLimit > 0 && newBalance < -creditLimit) {
              throw new ServiceError(
                "VALIDATION_ERROR",
                `Insufficient credit limit on ${account.id}. Available: ${(creditLimit + currentBalance).toFixed(2)}`,
              );
            }
          }
        }
      }

      // 1. Optional bill split header + participant rows.
      let billSplitId: string | null = null;
      if (splitPlan) {
        const [split] = await tx
          .insert(billSplits)
          .values({
            createdBy: actorUserId,
            title: splitPlan.title,
            totalAmount: fmtMoney(amount),
            currency: effectiveCurrency,
            date: effectiveDate,
            status: "active",
            notes: splitPlan.notes,
          })
          .returning();
        if (!split) {
          throw new ServiceError("INVALID_STATE", "Failed to create bill split");
        }
        billSplitId = split.id;

        await tx.insert(billSplitParticipants).values(
          splitPlan.shares.map((share) => ({
            billSplitId: split.id,
            userId: share.userId,
            contactId: share.contactId,
            name: share.name,
            shareType: share.shareType,
            shareValue: fmtMoney(share.shareValue),
            owedAmount: share.amount,
            paidAmount: "0.0000",
          })),
        );
      }

      // 2. The transaction itself — posted immediately, personal_amount is
      //    the creator's own share so analytics never double-count.
      const [transaction] = await tx
        .insert(transactions)
        .values({
          userId: actorUserId,
          createdBy: actorUserId,
          accountId: accountId ?? null,
          destinationAccountId: destinationAccountId ?? null,
          categoryId: categoryId ?? null,
          merchantId: merchantId ?? null,
          refundParentId: refundParentId ?? null,
          recurringRuleId: recurringRuleId ?? null,
          billSplitId,
          amount: fmtMoney(amount),
          personalAmount: fmtMoney(personalAmount),
          currency: effectiveCurrency,
          baseCurrency,
          exchangeRate: "1.0000000000",
          exchangeRateDate: effectiveDate,
          amountInBaseCurrency: fmtMoney(amount),
          type,
          status: "posted",
          date: effectiveDate,
          description: description ?? null,
          notes: notes ?? null,
          postedAt: new Date(),
        })
        .returning();
      if (!transaction) {
        throw new ServiceError("INVALID_STATE", "Failed to create transaction");
      }

      // 2b. Per-category allocation lines (optional).
      if (normalizedSplits != null) {
        await tx.insert(transactionSplits).values(
          normalizedSplits.map((s) => ({
            transactionId: transaction.id,
            userId: actorUserId,
            categoryId: s.categoryId,
            amount: fmtMoney(s.amount),
            note: s.note ?? null,
          })),
        );
      }

      // 3. One debt per OTHER participant (receivable owed to the creator).
      //    Debts are obligations, not income/expense — they never touch
      //    balances or analytics.
      if (splitPlan) {
        const debtRows = splitPlan.shares
          .filter((share) => share.userId !== actorUserId)
          .map((share) => ({
            createdBy: actorUserId,
            creditorUserId: actorUserId,
            debtorUserId: share.userId,
            debtorContactId: share.contactId,
            sourceType: "bill_split" as const,
            billSplitId,
            amount: share.amount,
            paidAmount: "0.0000",
            currency: effectiveCurrency,
            notes: splitPlan.title,
          }));
        if (debtRows.length > 0) {
          await tx.insert(debts).values(debtRows);
        }
      }

      // 4. Account balance cache: opening_balance + posted non-deleted
      //    transactions. Account-less transactions move nothing.
      const direction = transactionDirection(type);
      const delta = Number(amount) * direction;

      if (accountId != null) {
        await tx
          .update(financialAccounts)
          .set({
            balance: sql`${financialAccounts.balance} + ${fmtMoney(delta)}`,
            balanceUpdatedAt: new Date(),
          })
          .where(
            and(
              eq(financialAccounts.id, accountId),
              eq(financialAccounts.userId, actorUserId),
            ),
          );
      }
      if (type === "transfer" && destinationAccountId != null) {
        await tx
          .update(financialAccounts)
          .set({
            balance: sql`${financialAccounts.balance} + ${fmtMoney(amount)}`,
            balanceUpdatedAt: new Date(),
          })
          .where(
            and(
              eq(financialAccounts.id, destinationAccountId),
              eq(financialAccounts.userId, actorUserId),
            ),
          );
      }

      return transaction;
    });

    return toListItem(
      created,
      await resolveTransactionRefs(actorUserId, created),
      await loadSplits(created.id, created.userId),
    );
  } catch (error) {
    if (isForeignKeyViolation(error)) {
      throw new ServiceError("VALIDATION_ERROR", "Invalid account, category, merchant or split reference");
    }
    if (isCheckViolation(error)) {
      throw new ServiceError("VALIDATION_ERROR", "Transaction violates a financial invariant");
    }
    throw error;
  }
}

/**
 * Manual-entry creation: records the transaction, then emits a product
 * analytics event. Auto-posted recurring occurrences use the plain
 * `createTransaction` (they emit their own domain path).
 */
export async function createTransactionWithEvent(
  input: CreateTransactionInput,
): Promise<TransactionListItem> {
  const transaction = await createTransaction(input);

  const parsed = parseInput(
    createTransactionInputSchema,
    input,
    "createTransaction input",
  );
  await recordEvent({
    actorUserId: parsed.actorUserId,
    eventName: `transaction_${transaction.type}_created`,
    eventCategory: "transaction",
    entityType: "transaction",
    entityId: transaction.id,
    properties: {
      amount: transaction.amount,
      personalAmount: transaction.personalAmount,
      currency: transaction.currency,
      hasSplit: transaction.billSplitId != null,
      hasAccount: parsed.accountId != null,
    },
    idempotencyKey: `transaction_created:${transaction.id}`,
  });

  return transaction;
}

/** Sign convention: money INTO the source account is positive. */
function transactionDirection(type: SelectTransaction["type"]): 1 | -1 {
  switch (type) {
    case "income":
    case "refund":
      // A refund returns money to the creator's account, like income.
      return 1;
    case "expense":
    case "transfer":
      // Transfer: source is debited here; the destination is credited
      // separately by the caller.
      return -1;
    default:
      return -1;
  }
}

// -------------------------------------------------------------------
// Read
// -------------------------------------------------------------------

/**
 * Resolve display names for a transaction's category / account references.
 * Absent references resolve to null — the UI shows the "Uncategorized" /
 * "No account" fallbacks.
 */
async function resolveTransactionRefs(
  actorUserId: string,
  row: Pick<SelectTransaction, "categoryId" | "accountId">,
): Promise<{ categoryName: string | null; categoryColor: string | null; accountName: string | null }> {
  const [categoryRow, accountRow] = await Promise.all([
    row.categoryId
      ? db
          .select({ name: categories.name, color: categories.color })
          .from(categories)
          .where(
            and(
              eq(categories.id, row.categoryId),
              eq(categories.userId, actorUserId),
            ),
          )
          .limit(1)
      : Promise.resolve([]),
    row.accountId
      ? db
          .select({ name: financialAccounts.name })
          .from(financialAccounts)
          .where(
            and(
              eq(financialAccounts.id, row.accountId),
              eq(financialAccounts.userId, actorUserId),
            ),
          )
          .limit(1)
      : Promise.resolve([]),
  ]);

  return {
    categoryName: categoryRow[0]?.name ?? null,
    categoryColor: categoryRow[0]?.color ?? null,
    accountName: accountRow[0]?.name ?? null,
  };
}

/**
 * Load a transaction's per-category allocation lines with resolved category
 * display data. Empty when the transaction is not split.
 */
async function loadSplits(
  transactionId: string,
  ownerUserId: string,
): Promise<TransactionSplitItem[]> {
  const rows = await db
    .select({
      categoryId: transactionSplits.categoryId,
      amount: transactionSplits.amount,
      note: transactionSplits.note,
      categoryName: categories.name,
      categoryColor: categories.color,
    })
    .from(transactionSplits)
    .leftJoin(
      categories,
      and(
        eq(categories.id, transactionSplits.categoryId),
        eq(categories.userId, transactionSplits.userId),
      ),
    )
    .where(
      and(
        eq(transactionSplits.transactionId, transactionId),
        eq(transactionSplits.userId, ownerUserId),
      ),
    );

  return rows.map((r) => ({
    categoryId: r.categoryId,
    amount: r.amount,
    note: r.note,
    categoryName: r.categoryName ?? null,
    categoryColor: r.categoryColor ?? null,
  }));
}

export async function getTransaction(
  input: TransactionLookupInput,
): Promise<TransactionListItem> {
  const { actorUserId, transactionId } = parseInput(
    transactionLookupSchema,
    input,
    "getTransaction input",
  );


  const [transaction] = await db
    .select()
    .from(transactions)
    .where(
      and(
        eq(transactions.id, transactionId),
        eq(transactions.userId, actorUserId),
      ),
    )
    .limit(1);

  if (!transaction) {
    throw new ServiceError("NOT_FOUND", "Transaction not found");
  }
  return toListItem(
    transaction,
    await resolveTransactionRefs(actorUserId, transaction),
    await loadSplits(transactionId, actorUserId),
  );
}

export async function listTransactions(
  input: ListTransactionsInput,
): Promise<ReadonlyArray<TransactionListItem>> {
  const {
    actorUserId,
    accountId,
    type,
    status,
    dateFrom,
    dateTo,
    recurring,
    limit,
    offset,
  } = parseInput(listTransactionsInputSchema, input, "listTransactions input");


  const conditions = [eq(transactions.userId, actorUserId)];
  if (accountId != null) conditions.push(eq(transactions.accountId, accountId));
  if (type != null) conditions.push(eq(transactions.type, type));
  if (status != null) conditions.push(eq(transactions.status, status));
  if (dateFrom != null) conditions.push(gte(transactions.date, dateFrom));
  if (dateTo != null) conditions.push(lte(transactions.date, dateTo));

  // Recurring filter
  if (recurring === "recurring") {
    conditions.push(sql`${transactions.recurringRuleId} IS NOT NULL`);
  } else if (recurring === "non_recurring") {
    conditions.push(sql`${transactions.recurringRuleId} IS NULL`);
  }

  const rows = await db
    .select()
    .from(transactions)
    .where(and(...conditions))
    .orderBy(desc(transactions.date), desc(transactions.createdAt))
    .limit(limit)
    .offset(offset);

  // Batch-load split lines for the whole page in one query.
  const splitMap = new Map<string, TransactionSplitItem[]>();
  if (rows.length > 0) {
    const splitRows = await db
      .select({
        transactionId: transactionSplits.transactionId,
        categoryId: transactionSplits.categoryId,
        amount: transactionSplits.amount,
        note: transactionSplits.note,
        categoryName: categories.name,
        categoryColor: categories.color,
      })
      .from(transactionSplits)
      .leftJoin(
        categories,
        and(
          eq(categories.id, transactionSplits.categoryId),
          eq(categories.userId, transactionSplits.userId),
        ),
      )
      .where(
        and(
          eq(
            transactionSplits.userId,
            actorUserId,
          ),
          inArray(
            transactionSplits.transactionId,
            rows.map((r) => r.id),
          ),
        ),
      );
    for (const s of splitRows) {
      const list = splitMap.get(s.transactionId) ?? [];
      list.push({
        categoryId: s.categoryId,
        amount: s.amount,
        note: s.note,
        categoryName: s.categoryName ?? null,
        categoryColor: s.categoryColor ?? null,
      });
      splitMap.set(s.transactionId, list);
    }
  }

  return Promise.all(
    rows.map(async (row) =>
      toListItem(
        row,
        await resolveTransactionRefs(actorUserId, row),
        splitMap.get(row.id) ?? [],
      ),
    ),
  );
}

// -------------------------------------------------------------------
// Delete (soft) — reverses every financial side effect
// -------------------------------------------------------------------

/**
 * Soft-deletes a posted transaction and reverses its financial effects in
 * one DB transaction:
 *   - account balances move back by the same amounts createTransaction moved
 *   - an open bill split is cancelled and its UNPAID debts are cancelled
 *   - debts that already have payments stay active (partial payments must
 *     remain visible/settleable); the cancelled split keeps them auditable
 *
 * Guards:
 *   - only the creator can delete
 *   - already-cancelled transactions cannot be deleted again
 *   - SETTLED splits are immutable history (§51): the transaction that
 *     produced them is locked and cannot be deleted
 */
export async function deleteTransaction(
  input: DeleteTransactionInput,
): Promise<{ id: string }> {
  const { actorUserId, transactionId } = parseInput(
    deleteTransactionInputSchema,
    input,
    "deleteTransaction input",
  );


  const [transaction] = await db
    .select()
    .from(transactions)
    .where(
      and(eq(transactions.id, transactionId), eq(transactions.userId, actorUserId)),
    )
    .limit(1);
  if (!transaction) {
    throw new ServiceError("NOT_FOUND", "Transaction not found");
  }
  if (transaction.createdBy !== actorUserId) {
    throw new ServiceError("FORBIDDEN", "Only the creator can delete a transaction");
  }
  if (transaction.status === "cancelled") {
    throw new ServiceError("INVALID_STATE", "Transaction is already cancelled");
  }

  // Settled splits are settled history — locked (§51).
  if (transaction.billSplitId != null) {
    const [split] = await db
      .select({ status: billSplits.status })
      .from(billSplits)
      .where(eq(billSplits.id, transaction.billSplitId))
      .limit(1);
    if (split?.status === "settled") {
      throw new ServiceError(
        "INVALID_STATE",
        "This transaction's split is settled and can no longer be changed",
      );
    }
  }

  const direction = transactionDirection(transaction.type);
  const delta = Number(transaction.amount) * direction;

  await db.transaction(async (tx) => {
    // 0. Lock affected account rows to serialize concurrent balance mutations.
    const accountIds = [transaction.accountId, transaction.destinationAccountId].filter(
      (id): id is string => id != null,
    );
    if (accountIds.length > 0) {
      await tx
        .select({ id: financialAccounts.id })
        .from(financialAccounts)
        .where(
          and(
            eq(financialAccounts.userId, actorUserId),
            inArray(financialAccounts.id, accountIds),
          ),
        )
        .for("update");
    }

    // 1. Soft-delete the transaction itself.
    await tx
      .update(transactions)
      .set({ status: "cancelled", deletedAt: new Date() })
      .where(eq(transactions.id, transactionId));

    // 2. Reverse the account-balance cache (mirrors createTransaction).
    if (transaction.accountId != null) {
      await tx
        .update(financialAccounts)
        .set({
          balance: sql`${financialAccounts.balance} - ${fmtMoney(delta)}`,
          balanceUpdatedAt: new Date(),
        })
        .where(
          and(
            eq(financialAccounts.id, transaction.accountId),
            eq(financialAccounts.userId, actorUserId),
          ),
        );
    }
    if (
      transaction.type === "transfer" &&
      transaction.destinationAccountId != null
    ) {
      await tx
        .update(financialAccounts)
        .set({
          balance: sql`${financialAccounts.balance} - ${fmtMoney(transaction.amount)}`,
          balanceUpdatedAt: new Date(),
        })
        .where(
          and(
            eq(financialAccounts.id, transaction.destinationAccountId),
            eq(financialAccounts.userId, actorUserId),
          ),
        );
    }

    // 3. Cancel the split and its still-open debts.
    if (transaction.billSplitId != null) {
      await tx
        .update(billSplits)
        .set({ status: "cancelled" })
        .where(
          and(
            eq(billSplits.id, transaction.billSplitId),
            eq(billSplits.status, "active"),
          ),
        );

      const splitDebts = await tx
        .select({ id: debts.id, paidAmount: debts.paidAmount, cancelledAt: debts.cancelledAt })
        .from(debts)
        .where(eq(debts.billSplitId, transaction.billSplitId));

      const cancellable = splitDebts.filter(
        (d) => d.cancelledAt == null && Number(d.paidAmount) === 0,
      );
      if (cancellable.length > 0) {
        await tx
          .update(debts)
          .set({ cancelledAt: new Date() })
          .where(
            inArray(
              debts.id,
              cancellable.map((d) => d.id),
            ),
          );
      }
    }
  });

  return { id: transactionId };
}

export function previewSplit(input: SplitPreviewInput): SplitShare[] {
  const { amount, participants } = parseInput(
    splitPreviewInputSchema,
    input,
    "previewSplit input",
  );

  try {
    return allocateShares(amount, participants);
  } catch (error) {
    throw new ServiceError(
      "VALIDATION_ERROR",
      error instanceof Error ? error.message : "Invalid split",
    );
  }
}
