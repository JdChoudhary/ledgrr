import { db } from "@/lib/db";
import {
  billSplits,
  billSplitShares,
  transactions,
  debts,
  financialAccounts,
  settlements,
  categories,
  user,
} from "@/lib/db/schema";
import { eq, and, desc, isNull, sql } from "drizzle-orm";
import {
  validateAmount,
  FinanceError,
  verifyAccountOwnership,
} from "@/lib/finance";
import { dispatchNotification } from "@/lib/notifications";
import { syncTransactionAnalytics } from "@/lib/analytics";
import type { CreateSplitExpenseInput, SettleShareInput } from "./bill-split-schemas";

/** Create a split expense — creates bill_splits, shares, and a linked transaction */
export async function createSplitExpense(
  userId: string,
  input: CreateSplitExpenseInput,
) {
  const totalAmount = validateAmount(input.totalAmount, { positive: true });
  const numTotal = parseFloat(totalAmount);

  // Validate shares sum
  let sharesSum = 0;
  const normalizedShares = input.shares.map((s) => {
    const amt = parseFloat(validateAmount(s.amount, { positive: true }));
    sharesSum += amt;
    return { ...s, normalizedAmount: amt.toFixed(4) };
  });

  if (Math.abs(sharesSum - numTotal) > 0.0001) {
    throw new FinanceError(
      `Shares sum (${sharesSum}) does not match total amount (${numTotal})`,
      "INVALID_SPLIT",
      400,
    );
  }

  // Verify account ownership
  await verifyAccountOwnership(userId, input.accountId);

  // Resolve categoryId: could be a UUID or a category name
  let resolvedCategoryId: string | null = null;
  if (input.categoryId) {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(input.categoryId);
    if (isUuid) {
      resolvedCategoryId = input.categoryId;
    } else {
      // Look up category by name for this user
      const catRows = await db()
        .select({ id: categories.id })
        .from(categories)
        .where(eq(categories.name, input.categoryId))
        .limit(1);
      resolvedCategoryId = catRows[0]?.id ?? null;
    }
  }

  const now = new Date();
  const date = new Date(input.date);

  const result = await db().transaction(async (tx) => {
    // 1. Create bill_split
    const [split] = await tx
      .insert(billSplits)
      .values({
        creatorId: userId,
        title: input.title.trim(),
        totalAmount,
        accountId: input.accountId,
        categoryId: resolvedCategoryId,
        date,
        splitMethod: input.splitMethod,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    // 2. Create shares — non-owner shares each get a linked debts row
    const ownerShare = normalizedShares.find((s) => s.isOwner || s.userId === userId);
    const ownerAmount = ownerShare?.normalizedAmount || normalizedShares[0].normalizedAmount;

    // Get account currency for debt records
    const [account] = await tx
      .select({ currency: financialAccounts.currency })
      .from(financialAccounts)
      .where(eq(financialAccounts.id, input.accountId))
      .limit(1);
    const currency = account?.currency || "USD";

    const shareRows: Array<{
      splitId: string;
      userId: string;
      isOwner: boolean;
      amount: string;
      isPaid: boolean;
      paidAt: Date | null;
      debtId: string | null;
    }> = [];

    for (const s of normalizedShares) {
      const isOwner = s.isOwner || s.userId === userId;

      if (isOwner) {
        shareRows.push({
          splitId: split.id,
          userId: s.userId,
          isOwner: true,
          amount: s.normalizedAmount,
          isPaid: true,
          paidAt: now,
          debtId: null,
        });
        continue;
      }

      // Create the debt: the payer (userId) is the creditor,
      // this participant is the debtor.
      const [debt] = await tx
        .insert(debts)
        .values({
          creditorId: userId,
          debtorId: s.userId,
          amount: s.normalizedAmount,
          currency,
          description: `Share of "${input.title.trim()}"`,
          status: "pending",
          sourceType: "bill_split",
        })
        .returning();

      shareRows.push({
        splitId: split.id,
        userId: s.userId,
        isOwner: false,
        amount: s.normalizedAmount,
        isPaid: false,
        paidAt: null,
        debtId: debt.id,
      });
    }

    const createdShares = await tx
      .insert(billSplitShares)
      .values(shareRows)
      .returning();

    // 3. Create transaction (total amount leaves the account)
    const [txn] = await tx
      .insert(transactions)
      .values({
        userId,
        accountId: input.accountId,
        categoryId: resolvedCategoryId,
        type: "expense",
        amount: totalAmount,
        personalAmount: ownerAmount,
        description: `Bill split: ${input.title.trim()}`,
        date,
        billSplitId: split.id,
        status: "posted",
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    // Sync analytics summaries
    await syncTransactionAnalytics(tx, userId, txn, totalAmount);

    // 4. Update account balance
    const [locked] = await tx
      .select()
      .from(financialAccounts)
      .where(eq(financialAccounts.id, input.accountId))
      .for("update");

    const newBalance = (Number(locked.balance) - numTotal).toFixed(4);
    await tx
      .update(financialAccounts)
      .set({ balance: newBalance, updatedAt: now })
      .where(eq(financialAccounts.id, input.accountId));

    return {
      split,
      shares: createdShares,
      transaction: txn,
    };
  });

  // --- Post-commit notifications ---
  // Notify each non-owner share holder that they've been added to a split
  const nonOwnerShares = result.shares.filter((s: any) => !s.isOwner);
  for (const share of nonOwnerShares) {
    await dispatchNotification({
      userId: share.userId,
      type: "bill_split_request",
      severity: "info",
      title: "You've been added to a split",
      message: `You owe ₹${Number(share.amount).toFixed(2)} for "${input.title.trim()}".`,
      entityType: "bill_split",
      entityId: result.split.id,
    });
  }

  return {
    ...result.split,
    totalAmount: Number(result.split.totalAmount),
    shares: result.shares,
    transaction: { ...result.transaction, amount: Number(result.transaction.amount) },
  };
}

/** Settle a share — marks as paid, syncs the linked debt, optionally creates a transfer transaction.
 * IMPORTANT: debts.paidAmount and billSplitShares.isPaid must always be updated
 * in the SAME transaction to prevent the two-source-of-truth drift problem.
 */
export async function settleShare(
  userId: string,
  input: SettleShareInput,
) {
  const share = await db()
    .select()
    .from(billSplitShares)
    .where(eq(billSplitShares.id, input.shareId))
    .limit(1);

  if (share.length === 0) {
    throw new FinanceError("Share not found", "NOT_FOUND", 404);
  }

  const shareRow = share[0];
  if (shareRow.isPaid) {
    throw new FinanceError("Share already paid", "ALREADY_PAID", 400);
  }

  // Get the split to find the creator
  const split = await db()
    .select()
    .from(billSplits)
    .where(eq(billSplits.id, shareRow.splitId))
    .limit(1);

  if (split.length === 0) {
    throw new FinanceError("Split not found", "NOT_FOUND", 404);
  }

  const now = new Date();
  const splitAmount = Number(shareRow.amount);

  if (input.method === "cash") {
    // Cash: mark share + debt as paid in the same transaction
    await db().transaction(async (tx) => {
      // Update the share
      await tx
        .update(billSplitShares)
        .set({ isPaid: true, paidAt: now, updatedAt: now })
        .where(eq(billSplitShares.id, input.shareId));

      // Sync the linked debt if one exists
      if (shareRow.debtId) {
        const [debt] = await tx
          .select()
          .from(debts)
          .where(eq(debts.id, shareRow.debtId))
          .for("update");

        if (debt) {
          const newPaidAmount = String(Number(debt.paidAmount) + splitAmount);
          const isFullyPaid = Number(newPaidAmount) >= Number(debt.amount);
          await tx
            .update(debts)
            .set({
              paidAmount: newPaidAmount,
              status: isFullyPaid ? "paid" : "partial",
              updatedAt: now,
            })
            .where(eq(debts.id, shareRow.debtId));
        }
      }
    });

    return { ...shareRow, isPaid: true, paidAt: now };
  }

  // app_transfer: create settlement + transfer transaction + sync debt
  if (!input.accountId) {
    throw new FinanceError(
      "accountId is required for app_transfer",
      "INVALID_INPUT",
      400,
    );
  }

  // Verify the payer owns the account
  await verifyAccountOwnership(userId, input.accountId);

  const payerAccountId = input.accountId;
  const creatorAccountId = split[0].accountId;

  const result = await db().transaction(async (tx) => {
    // Create settlement
    const [settlement] = await tx
      .insert(settlements)
      .values({
        sourceType: "bill_split",
        sourceId: shareRow.splitId,
        fromUserId: userId,
        toUserId: split[0].creatorId,
        amount: String(splitAmount),
        description: `Settlement for: ${split[0].title}`,
        createdAt: now,
      })
      .returning();

    // Create transfer transaction from payer to creator's account
    const [txn] = await tx
      .insert(transactions)
      .values({
        userId,
        accountId: payerAccountId,
        toAccountId: creatorAccountId || undefined,
        type: "transfer",
        amount: String(splitAmount),
        description: `Settlement for: ${split[0].title}`,
        date: now,
        status: "posted",
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    // Sync analytics summaries
    await syncTransactionAnalytics(tx, userId, txn, String(splitAmount));

    // Mark share as paid + sync linked debt in the SAME transaction
    await tx
      .update(billSplitShares)
      .set({
        isPaid: true,
        paidAt: now,
        settlementTransactionId: txn.id,
        updatedAt: now,
      })
      .where(eq(billSplitShares.id, input.shareId));

    // Sync the linked debt if one exists
    if (shareRow.debtId) {
      const [debt] = await tx
        .select()
        .from(debts)
        .where(eq(debts.id, shareRow.debtId))
        .for("update");

      if (debt) {
        const newPaidAmount = String(Number(debt.paidAmount) + splitAmount);
        const isFullyPaid = Number(newPaidAmount) >= Number(debt.amount);
        await tx
          .update(debts)
          .set({
            paidAmount: newPaidAmount,
            status: isFullyPaid ? "paid" : "partial",
            updatedAt: now,
          })
          .where(eq(debts.id, shareRow.debtId));
      }
    }

    // Update account balances
    const [payerAccount] = await tx
      .select()
      .from(financialAccounts)
      .where(eq(financialAccounts.id, payerAccountId))
      .for("update");

    const payerNewBalance = (Number(payerAccount.balance) - splitAmount).toFixed(4);
    await tx
      .update(financialAccounts)
      .set({ balance: payerNewBalance, updatedAt: now })
      .where(eq(financialAccounts.id, payerAccountId));

    if (creatorAccountId) {
      const [creatorAccount] = await tx
        .select()
        .from(financialAccounts)
        .where(eq(financialAccounts.id, creatorAccountId))
        .for("update");

      const creatorNewBalance = (Number(creatorAccount.balance) + splitAmount).toFixed(4);
      await tx
        .update(financialAccounts)
        .set({ balance: creatorNewBalance, updatedAt: now })
        .where(eq(financialAccounts.id, creatorAccountId));
    }

    return { settlement, transaction: txn };
  });

  return {
    ...shareRow,
    isPaid: true,
    paidAt: now,
    settlement: result.settlement,
    transaction: { ...result.transaction, amount: Number(result.transaction.amount) },
  };
}

/** Get receivables summary (who owes me) */
export async function getReceivables(userId: string) {
  const rows = await db()
    .select({
      friendId: billSplitShares.userId,
      owed: sql<string>`SUM(${billSplitShares.amount})`,
    })
    .from(billSplitShares)
    .innerJoin(billSplits, eq(billSplits.id, billSplitShares.splitId))
    .where(
      and(
        eq(billSplits.creatorId, userId),
        eq(billSplitShares.isOwner, false),
        eq(billSplitShares.isPaid, false),
        isNull(billSplits.deletedAt),
      ),
    )
    .groupBy(billSplitShares.userId);

  return rows.map((r) => ({
    friendId: r.friendId,
    owed: Number(r.owed),
  }));
}

/** Get a single bill split with joined shares + user names */
export async function getBillSplitDetail(userId: string, splitId: string) {
  const [split] = await db()
    .select()
    .from(billSplits)
    .where(
      and(
        eq(billSplits.id, splitId),
        isNull(billSplits.deletedAt),
      ),
    )
    .limit(1);

  if (!split) return null;

  // Get shares with user info
  const shares = await db()
    .select({
      id: billSplitShares.id,
      userId: billSplitShares.userId,
      amount: billSplitShares.amount,
      isOwner: billSplitShares.isOwner,
      isPaid: billSplitShares.isPaid,
      paidAt: billSplitShares.paidAt,
      debtId: billSplitShares.debtId,
      userName: user.name,
      userUsername: user.username,
    })
    .from(billSplitShares)
    .leftJoin(user, eq(billSplitShares.userId, user.id))
    .where(eq(billSplitShares.splitId, splitId));

  // Get creator info
  const [creator] = await db()
    .select({ id: user.id, name: user.name, username: user.username })
    .from(user)
    .where(eq(user.id, split.creatorId))
    .limit(1);

  return {
    ...split,
    totalAmount: Number(split.totalAmount),
    creator: creator || null,
    shares: shares.map((s) => ({
      id: s.id,
      userId: s.userId,
      amount: Number(s.amount),
      isOwner: s.isOwner,
      isPaid: s.isPaid,
      paidAt: s.paidAt,
      debtId: s.debtId,
      user: s.userName ? { id: s.userId, name: s.userName, username: s.userUsername } : null,
    })),
  };
}

/** List bill splits for a user */
export async function listBillSplits(userId: string) {
  // Get splits where user is creator
  const createdSplits = await db()
    .select()
    .from(billSplits)
    .where(
      and(
        eq(billSplits.creatorId, userId),
        isNull(billSplits.deletedAt),
      ),
    )
    .orderBy(desc(billSplits.createdAt));

  // Get splits where user has a share
  const userShares = await db()
    .select({ splitId: billSplitShares.splitId })
    .from(billSplitShares)
    .where(
      and(
        eq(billSplitShares.userId, userId),
        eq(billSplitShares.isPaid, false),
      ),
    );

  const shareSplitIds = userShares.map((s) => s.splitId);
  const uniqueSplitIds = [...new Set([...createdSplits.map((s) => s.id), ...shareSplitIds])];

  if (uniqueSplitIds.length === 0) return [];

  const allSplits = await db()
    .select()
    .from(billSplits)
    .where(
      and(
        sql`${billSplits.id} IN ${uniqueSplitIds}`,
        isNull(billSplits.deletedAt),
      ),
    )
    .orderBy(desc(billSplits.createdAt));

  // Get all shares for these splits
  const allShares = await db()
    .select()
    .from(billSplitShares)
    .where(sql`${billSplitShares.splitId} IN ${uniqueSplitIds}`);

  return allSplits.map((split) => ({
    ...split,
    totalAmount: Number(split.totalAmount),
    shares: allShares
      .filter((s) => s.splitId === split.id)
      .map((s) => ({
        ...s,
        amount: Number(s.amount),
      })),
  }));
}
