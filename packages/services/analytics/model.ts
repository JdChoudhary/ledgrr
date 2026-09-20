import { z } from "zod";
import {
  dateSchema,
  userIdSchema,
  uuidSchema,
} from "../lib/schema";

/**
 * Product/usage analytics — separate from accounting.
 *
 * Events are written to `analytics_events` on meaningful user actions
 * (transaction created, goal funded, debt settled, ...) and are NEVER used to
 * calculate financial totals — the dashboard's financial aggregates are
 * computed from `transactions` (the source of truth) on read.
 */

// ---------------------------------------------------------------------------
// Record
// ---------------------------------------------------------------------------

export const eventCategorySchema = z.enum([
  "transaction",
  "budget",
  "goal",
  "debt",
  "account",
  "space",
  "bill_split",
  "recurring",
  "navigation",
]);

export const recordEventInputSchema = z.object({
  actorUserId: userIdSchema,

  spaceId: uuidSchema.nullable().optional(),
  sessionId: uuidSchema.nullable().optional(),

  eventName: z.string().trim().min(1).max(120),
  eventCategory: eventCategorySchema.nullable().optional(),

  entityType: z.string().trim().min(1).max(120).nullable().optional(),
  entityId: uuidSchema.nullable().optional(),

  properties: z.record(z.string(), z.unknown()).nullable().optional(),

  /**
   * Dedupe key — repeated calls with the same key are no-ops (unique partial
   * index on idempotency_key). e.g. `transaction_created:<transactionId>`
   * makes double-inserts harmless.
   */
  idempotencyKey: z.string().trim().min(1).max(255).nullable().optional(),
});

export type RecordEventInput = z.input<typeof recordEventInputSchema>;

// ---------------------------------------------------------------------------
// Dashboard summary (financial aggregates, computed from transactions)
// ---------------------------------------------------------------------------

export const dashboardSummaryInputSchema = z.object({
  spaceId: uuidSchema,
  actorUserId: userIdSchema,
  /** Inclusive ledger-date range. Defaults to the current calendar month. */
  fromDate: dateSchema.nullable().optional(),
  toDate: dateSchema.nullable().optional(),
});

export type DashboardSummaryInput = z.input<typeof dashboardSummaryInputSchema>;

export type DashboardSummary = {
  fromDate: string;
  toDate: string;
  currency: string;
  /** Money received: income + refunds − own share of split expenses... */
  income: string;
  /** Personal expense: the actor's own share (personal_amount), not gross. */
  personalExpense: string;
  /** Gross expense across the space's transactions. */
  grossExpense: string;
  refund: string;
  transactionCount: number;
  splitCount: number;
  /** receivables + payables outstanding across open debts (derived). */
  outstandingDebt: string;
};

// ---------------------------------------------------------------------------
// Cash-flow trend (daily income/expense buckets for charts)
// ---------------------------------------------------------------------------

export const cashflowInputSchema = z.object({
  spaceId: uuidSchema,
  actorUserId: userIdSchema,
  fromDate: dateSchema,
  toDate: dateSchema,
});

export type CashflowInput = z.input<typeof cashflowInputSchema>;

export type CashflowPoint = {
  date: string;
  income: number;
  expense: number;
};

// ---------------------------------------------------------------------------
// Category breakdown (personal expense per category for the period)
// ---------------------------------------------------------------------------

export const categoryBreakdownInputSchema = z.object({
  spaceId: uuidSchema,
  actorUserId: userIdSchema,
  fromDate: dateSchema,
  toDate: dateSchema,
  limit: z.number().int().min(1).max(50).optional().default(8),
});

export type CategoryBreakdownInput = z.input<typeof categoryBreakdownInputSchema>;

export type CategoryBreakdownRow = {
  categoryId: string | null;
  name: string;
  amount: number;
};

// ---------------------------------------------------------------------------
// Read back events (debug/admin views)
// ---------------------------------------------------------------------------

export const listEventsServiceSchema = z.object({
  actorUserId: userIdSchema,
  spaceId: uuidSchema.nullable().optional(),
  limit: z.number().int().min(1).max(200).optional().default(50),
});

export type AnalyticsEventItem = {
  id: string;
  userId: string;
  spaceId: string | null;
  eventName: string;
  eventCategory: string | null;
  entityType: string | null;
  entityId: string | null;
  properties: unknown;
  occurredAt: Date;
};
