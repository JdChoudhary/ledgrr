import { z } from "zod";
import { uuidSchema } from "@repo/services/lib/schema";

/**
 * Contracts for the analytics router.
 *
 * `track` records product events from the client (page views, feature
 * usage). Financial aggregates live under the `dashboard` router — events
 * are never used for money math.
 */

export const trackEventSchema = z.object({
  sessionId: uuidSchema.nullable().optional(),
  eventName: z.string().trim().min(1).max(120),
  eventCategory: z
    .enum([
      "transaction",
      "budget",
      "goal",
      "debt",
      "account",
      "bill_split",
      "recurring",
      "navigation",
    ])
    .nullable()
    .optional(),
  entityType: z.string().trim().min(1).max(120).nullable().optional(),
  entityId: uuidSchema.nullable().optional(),
  properties: z.record(z.string(), z.unknown()).nullable().optional(),
  idempotencyKey: z.string().trim().min(1).max(255).nullable().optional(),
});

export const trackEventResponseSchema = z.object({
  ok: z.boolean(),
});

export const listEventsSchema = z.object({
  limit: z.number().int().min(1).max(200).optional().default(50),
});

export const analyticsEventSchema = z.object({
  id: z.string(),
  userId: z.string(),
  eventName: z.string(),
  eventCategory: z.string().nullable(),
  entityType: z.string().nullable(),
  entityId: z.string().nullable(),
  properties: z.unknown().nullable(),
  occurredAt: z.date(),
});

export type AnalyticsEventRow = z.output<typeof analyticsEventSchema>;
