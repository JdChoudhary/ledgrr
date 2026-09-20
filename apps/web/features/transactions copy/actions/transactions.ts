import { db } from "@/lib/db";
import {
  transactions,
  financialAccounts,
  budgets,
  categories,
  billSplitShares,
} from "@/lib/db/schema";
import {
  eq,
  and,
  desc,
  isNull,
  lt,
  gt,
  lte,
  gte,
  sql,
  inArray,
  like,
  or,
  type SQL,
} from "drizzle-orm";
import {
  validateAmount,
  FinanceError,
  verifyAccountOwnership,
} from "@/lib/finance";
import {
  applyTransactionEffect,
  reverseBalanceEffect,
  findActiveBudget,
  updateBudgetSpend,
  checkBudgetThresholdsAndNotify,
  checkHighSpendAndNotify,
} from "@/lib/transactions-balance";
import { updateDailySummary, takeNetWorthSnapshot } from "@/lib/analytics";
import type {
  CreateTransactionInput,
  UpdateTransactionInput,
  ListTransactionsInput,
} from "./transaction-schemas";

// ============================================================
// CRUD actions
// ============================================================

/** Create a new transaction with proper locking and balance effects */
export async function createTransaction(
  userId: string,
  input: CreateTransactionInput,
) {
  const amount = validateAmount(input.amount, { positive: true });

  const now = new Date();
  const date = new Date(input.date);

  // If there's a categoryId, check for budget spend update
  let budgetRow: any = null;

  if (input.categoryId && input.type === "expense") {
    const budgetId = await findActiveBudget(db(), userId, input.categoryId, date);
    if (budgetId) {
      const rows = await db().select().from(budgets).where(eq(budgets.id, budgetId)).limit(1);
      if (rows.length > 0) budgetRow = rows[0];
    }
  }

  let newBudgetSpend: string | null = null;

  const result = await db().transaction(async (tx) => {
    // Apply balance effect
    await applyTransactionEffect(
      tx,
      input.accountId,
      input.toAccountId,
      userId,
      input.type,
      amount,
    );

    // Update budget spend if applicable (only for expenses)
    if (budgetRow && input.type === "expense") {
      const spendDelta = input.personalAmount ? String(input.personalAmount) : amount;
      await updateBudgetSpend(tx, budgetRow.id, spendDelta);
      newBudgetSpend = (Number(budgetRow.spend) + Number(spendDelta)).toFixed(4);
    }

    // Insert the transaction
    const [created] = await tx
      .insert(transactions)
      .values({
        userId,
        accountId: input.accountId,
        toAccountId: input.toAccountId || null,
        categoryId: input.categoryId || null,
        type: input.type,
        amount,
        description: input.description?.trim() || null,
        date,
        currency: input.currency || "USD",
        baseCurrency: input.currency || "USD",
        notes: input.notes || null,
        personalAmount: input.personalAmount
          ? String(input.personalAmount)
          : null,
        refundOfTransactionId: input.refundOfTransactionId || null,
        debtId: input.debtId || null,
        billSplitId: input.billSplitId || null,
        goalId: input.goalId || null,
        status: "posted",
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    // Update daily analytics summaries (atomic with transaction)
    await updateDailySummary(
      tx,
      userId,
      date,
      input.type,
      Number(amount),
      input.categoryId || null,
      amount, // positive delta for create
      input.accountId,
    );

    // Take net worth snapshot (atomic with balance change)
    await takeNetWorthSnapshot(tx, userId);

    return created;
  });

  // --- Post-commit notifications (outside transaction) ---
  // Budget threshold notifications — fire once per threshold crossing
  if (budgetRow && newBudgetSpend) {
    await checkBudgetThresholdsAndNotify(budgetRow, newBudgetSpend);
  }

  // High spend notification — independent of budgets
  if (input.type === "expense") {
    await checkHighSpendAndNotify(userId, input.categoryId ?? null, amount);
  }

  return { ...result, amount: Number(result.amount) };
}

/** Update a transaction — reverses old effect, applies new one */
export async function updateTransaction(
  userId: string,
  id: string,
  input: UpdateTransactionInput,
) {
  const existing = await db()
    .select()
    .from(transactions)
    .where(
      and(
        eq(transactions.id, id),
        eq(transactions.userId, userId),
        isNull(transactions.deletedAt),
      ),
    )
    .limit(1);

  if (existing.length === 0) {
    throw new FinanceError("Transaction not found", "NOT_FOUND", 404);
  }

  const oldTxn = existing[0];
  const now = new Date();

  const newType = input.type || oldTxn.type;
  const newAmount = input.amount
    ? validateAmount(input.amount, { positive: true })
    : oldTxn.amount;
  const newAccountId = input.accountId || oldTxn.accountId;
  const newToAccountId =
    input.toAccountId !== undefined ? input.toAccountId : oldTxn.toAccountId;

  if (newType === "transfer" && !newToAccountId) {
    throw new FinanceError("Transfer requires toAccountId", "INVALID_INPUT", 400);
  }
  if (newType === "transfer" && newAccountId === newToAccountId) {
    throw new FinanceError("Source and destination accounts must differ", "INVALID_INPUT", 400);
  }
  if (newType === "refund" && !oldTxn.refundOfTransactionId) {
    throw new FinanceError("Refund requires refundOfTransactionId", "INVALID_INPUT", 400);
  }

  await db().transaction(async (tx) => {
    // Reverse old effect
    await reverseBalanceEffect(tx, oldTxn, userId);

    // Reverse old budget spend
    if (oldTxn.categoryId && oldTxn.type === "expense") {
      const oldBudgetId = await findActiveBudget(tx, userId, oldTxn.categoryId, oldTxn.date);
      if (oldBudgetId) {
        await updateBudgetSpend(tx, oldBudgetId, `-${oldTxn.amount}`);
      }
    }

    // Apply new effect
    await applyTransactionEffect(tx, newAccountId, newToAccountId, userId, newType, newAmount);

    // Apply new budget spend
    const newCategoryId = input.categoryId !== undefined ? input.categoryId : oldTxn.categoryId;
    if (newCategoryId && newType === "expense") {
      const newBudgetId = await findActiveBudget(tx, userId, newCategoryId, new Date(input.date || oldTxn.date));
      if (newBudgetId) {
        await updateBudgetSpend(tx, newBudgetId, newAmount);
      }
    }

    // Update the transaction row
    const updates: Record<string, unknown> = { updatedAt: now };
    if (input.accountId) updates.accountId = input.accountId;
    if (input.toAccountId !== undefined) updates.toAccountId = input.toAccountId;
    if (input.categoryId !== undefined) updates.categoryId = input.categoryId;
    if (input.type) updates.type = input.type;
    if (input.amount) updates.amount = newAmount;
    if (input.description) updates.description = input.description.trim();
    if (input.date) updates.date = new Date(input.date);
    if (input.notes !== undefined) updates.notes = input.notes;
    if (input.status) updates.status = input.status;

    await tx.update(transactions).set(updates).where(eq(transactions.id, id));

    // Update analytics: reverse old, apply new
    const newDate = input.date || oldTxn.date;
    // Reverse old summary
    await updateDailySummary(tx, userId, oldTxn.date, oldTxn.type, Number(oldTxn.amount), oldTxn.categoryId, `-${oldTxn.amount}`, oldTxn.accountId);
    // Apply new summary
    await updateDailySummary(tx, userId, newDate, newType, Number(newAmount), newCategoryId, newAmount, newAccountId);

    // Take net worth snapshot after balance change
    await takeNetWorthSnapshot(tx, userId);
  });

  const [updated] = await db().select().from(transactions).where(eq(transactions.id, id)).limit(1);
  return { ...updated, amount: Number(updated.amount) };
}

/** Soft-delete a transaction and reverse its balance effect */
export async function deleteTransaction(userId: string, id: string) {
  const existing = await db()
    .select()
    .from(transactions)
    .where(and(eq(transactions.id, id), eq(transactions.userId, userId), isNull(transactions.deletedAt)))
    .limit(1);

  if (existing.length === 0) {
    throw new FinanceError("Transaction not found", "NOT_FOUND", 404);
  }

  const oldTxn = existing[0];
  const now = new Date();

  await db().transaction(async (tx) => {
    await reverseBalanceEffect(tx, oldTxn, userId);

    if (oldTxn.categoryId && oldTxn.type === "expense") {
      const budgetId = await findActiveBudget(tx, userId, oldTxn.categoryId, oldTxn.date);
      if (budgetId) {
        await updateBudgetSpend(tx, budgetId, `-${oldTxn.amount}`);
      }
    }

    await tx.update(transactions).set({ deletedAt: now, updatedAt: now }).where(eq(transactions.id, id));

    // Reverse analytics summary
    await updateDailySummary(tx, userId, oldTxn.date, oldTxn.type, Number(oldTxn.amount), oldTxn.categoryId, `-${oldTxn.amount}`, oldTxn.accountId);

    // Take net worth snapshot after balance change
    await takeNetWorthSnapshot(tx, userId);
  });
}

/** Get a single transaction by ID — includes bill split shares when applicable */
export async function getTransactionById(userId: string, id: string) {
  const rows = await db()
    .select()
    .from(transactions)
    .where(and(eq(transactions.id, id), eq(transactions.userId, userId), isNull(transactions.deletedAt)))
    .limit(1);

  if (rows.length === 0) {
    throw new FinanceError("Transaction not found", "NOT_FOUND", 404);
  }

  const txn = rows[0];
  const result: Record<string, unknown> = { ...txn, amount: Number(txn.amount) };

  // If this is a shared/split transaction, fetch the split shares
  if (txn.billSplitId) {
    const shares = await db()
      .select({
        id: billSplitShares.id,
        userId: billSplitShares.userId,
        amount: billSplitShares.amount,
        isOwner: billSplitShares.isOwner,
        isPaid: billSplitShares.isPaid,
        percentage: billSplitShares.percentage,
      })
      .from(billSplitShares)
      .where(eq(billSplitShares.splitId, txn.billSplitId));

    // Get user names for the shares
    const shareUserIds = shares.map((s) => s.userId);
    let userNames: Record<string, string> = {};
    if (shareUserIds.length > 0) {
      const { user } = await import("@/lib/db/auth-schema");
      const users = await db()
        .select({ id: user.id, name: user.name, image: user.image })
        .from(user)
        .where(sql`${user.id} IN ${shareUserIds}`);
      for (const u of users) {
        userNames[u.id] = u.name;
      }
    }

    result.billSplitShares = shares.map((s) => ({
      ...s,
      amount: Number(s.amount),
      userName: userNames[s.userId] || "Unknown",
    }));
  }

  return result;
}

/** List transactions with cursor pagination and filters */
export async function listTransactions(userId: string, input: ListTransactionsInput) {
  const conditions: SQL[] = [eq(transactions.userId, userId), isNull(transactions.deletedAt)];

  if (input.accountId) conditions.push(eq(transactions.accountId, input.accountId));
  if (input.categoryId) conditions.push(eq(transactions.categoryId, input.categoryId));
  if (input.type && input.type.length > 0) conditions.push(inArray(transactions.type, input.type as any[]));
  if (input.dateFrom) conditions.push(gte(transactions.date, new Date(input.dateFrom)));
  if (input.dateTo) conditions.push(lte(transactions.date, new Date(input.dateTo)));
  if (input.search) {
    conditions.push(or(like(transactions.description, `%${input.search}%`), like(transactions.notes, `%${input.search}%`))!);
  }

  const limit = input.limit + 1;

  if (input.cursor) {
    const [cursorDate, cursorId] = input.cursor.split("|");
    conditions.push(or(lt(transactions.date, new Date(cursorDate)), and(eq(transactions.date, new Date(cursorDate)), lt(transactions.id, cursorId)))!);
  }

  const rows = await db()
    .select({
      // transaction columns
      id: transactions.id,
      userId: transactions.userId,
      date: transactions.date,
      amount: transactions.amount,
      personalAmount: transactions.personalAmount,
      description: transactions.description,
      type: transactions.type,
      status: transactions.status,
      notes: transactions.notes,
      currency: transactions.currency,
      deletedAt: transactions.deletedAt,
      createdAt: transactions.createdAt,
      updatedAt: transactions.updatedAt,
      accountId: transactions.accountId,
      toAccountId: transactions.toAccountId,
      categoryId: transactions.categoryId,
      billSplitId: transactions.billSplitId,
      debtId: transactions.debtId,
      isShared: sql<boolean>`${transactions.billSplitId} IS NOT NULL`,
      isDebtLinked: sql<boolean>`${transactions.debtId} IS NOT NULL`,
      // joined category
      category: {
        id: categories.id,
        name: categories.name,
        type: categories.type,
        color: categories.color,
        icon: categories.icon,
      },
    })
    .from(transactions)
    .leftJoin(categories, eq(transactions.categoryId, categories.id))
    .where(and(...conditions))
    .orderBy(desc(transactions.date), desc(transactions.id))
    .limit(limit);

  const hasNextPage = rows.length > input.limit;
  const items = hasNextPage ? rows.slice(0, input.limit) : rows;
  const nextCursor = hasNextPage ? `${items[items.length - 1].date.toISOString()}|${items[items.length - 1].id}` : null;

  // Attach account info from financialAccounts
  const accountIds = [...new Set(items.flatMap((r) => [r.accountId, r.toAccountId].filter(Boolean) as string[]))];
  const accounts = accountIds.length > 0
    ? await db().select().from(financialAccounts).where(inArray(financialAccounts.id, accountIds))
    : [];
  const accountMap = new Map(accounts.map((a) => [a.id, { id: a.id, name: a.name, color: a.color, type: a.type }]));

  return {
    items: items.map((r) => ({
      ...r,
      amount: Number(r.amount),
      personalAmount: r.personalAmount ? Number(r.personalAmount) : null,
      category: r.category?.id ? r.category : null,
      account: r.accountId ? accountMap.get(r.accountId) ?? null : null,
      toAccount: r.toAccountId ? accountMap.get(r.toAccountId) ?? null : null,
    })),
    nextCursor,
    hasMore: hasNextPage,
  };
}
