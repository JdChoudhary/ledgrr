import { db, desc, eq } from "@repo/database";
import { analyticsEvents } from "@repo/database/schema";
import { parseInput } from "../lib/schema";
import {
  listEventsServiceSchema,
  type AnalyticsEventItem,
} from "./model";

/**
 * Read back recent product events (admin/debug views), scoped to the actor.
 */
export async function listEvents(input: {
  actorUserId: string;
  limit?: number;
}): Promise<AnalyticsEventItem[]> {
  const { actorUserId, limit } = parseInput(
    listEventsServiceSchema,
    input,
    "listEvents input",
  );

  const rows = await db
    .select()
    .from(analyticsEvents)
    .where(eq(analyticsEvents.userId, actorUserId))
    .orderBy(desc(analyticsEvents.occurredAt))
    .limit(limit);

  return rows.map((row) => ({
    id: row.id,
    userId: row.userId,
    eventName: row.eventName,
    eventCategory: row.eventCategory,
    entityType: row.entityType,
    entityId: row.entityId,
    properties: row.properties,
    occurredAt: row.occurredAt,
  }));
}
