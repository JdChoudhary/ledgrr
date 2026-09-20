import { db } from "@/lib/db";
import { debts } from "@/lib/db/schema";
import { eq, and, sql, isNull } from "drizzle-orm";

/**
 * Receivables summary (who owes me — headline numbers).
 * Still used by: /api/dashboard/receivables → friends page
 */
export async function receivablesSummary(userId: string) {
  const rows = await db()
    .select({
      creditorId: debts.creditorId,
      debtorId: debts.debtorId,
      total: sql<string>`SUM(${debts.amount} - ${debts.paidAmount})`,
    })
    .from(debts)
    .where(
      and(
        eq(debts.creditorId, userId),
        isNull(debts.deletedAt),
      ),
    )
    .groupBy(debts.creditorId, debts.debtorId);

  return rows.map((r) => ({
    debtorId: r.debtorId,
    remaining: Number(r.total),
  }));
}

/**
 * Debts summary (what I owe — headline numbers).
 * Still used by: /api/dashboard/debts-summary → friends page
 */
export async function debtsSummary(userId: string) {
  const rows = await db()
    .select({
      creditorId: debts.creditorId,
      debtorId: debts.debtorId,
      total: sql<string>`SUM(${debts.amount} - ${debts.paidAmount})`,
    })
    .from(debts)
    .where(
      and(
        eq(debts.debtorId, userId),
        isNull(debts.deletedAt),
      ),
    )
    .groupBy(debts.creditorId, debts.debtorId);

  return rows.map((r) => ({
    creditorId: r.creditorId,
    remaining: Number(r.total),
  }));
}
