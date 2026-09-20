import { and, db, desc, eq } from "@repo/database";
import { analyticsEvents } from "@repo/database/schema";
import { parseInput } from "../lib/schema";
import {
  listEventsServiceSchema,
  type AnalyticsEventItem,
} from "./model";

/**
 * Read back recent product events (admin/debug views). Space-scoped when a
 * spaceId is provided, otherwise the actor's personal (space-less) events.
 */
export async function listEvents(input: {
  actorUserId: string;
  spaceId?: string | null;
  limit?: number;
}): Promise<AnalyticsEventItem[]> {
  const { actorUserId, spaceId, limit } = parseInput(
    listEventsServiceSchema,
    input,
    "listEvents input",
  );

  const rows = await db
    .select()
    .from(analyticsEvents)
    .where(
      and(
        eq(analyticsEvents.userId, actorUserId),
        ...(spaceId != null ? [eq(analyticsEvents.spaceId, spaceId)] : []),
      ),
    )
    .orderBy(desc(analyticsEvents.occurredAt))
    .limit(limit);

  return rows.map((row) => ({
    id: row.id,
    userId: row.userId,
    spaceId: row.spaceId,
    eventName: row.eventName,
    eventCategory: row.eventCategory,
    entityType: row.entityType,
    entityId: row.entityId,
    properties: row.properties,
    occurredAt: row.occurredAt,
  }));
}
