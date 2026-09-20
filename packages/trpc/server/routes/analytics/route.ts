import { z } from "zod";
import { router, authenticatedProcedure } from "../../trpc";
import { generatePath } from "../../utils/path-generator";
import { recordEvent, listEvents } from "@repo/services/analytics";
import {
  trackEventSchema,
  trackEventResponseSchema,
  listEventsSchema,
  analyticsEventSchema,
} from "./model";

const TAGS = ["Analytics"] as string[];
const getPath = generatePath("/analytics");

export const analyticsRouter = router({
  /**
   * Record a product event from the client (page views, feature usage).
   * Safe to fire-and-forget from the UI; duplicate idempotency keys are
   * silently dropped server-side.
   */
  track: authenticatedProcedure
    .meta({
      openapi: { method: "POST", path: getPath("/events"), tags: TAGS },
    })
    .input(trackEventSchema)
    .output(trackEventResponseSchema)
    .mutation(async ({ input, ctx }) => {
      await recordEvent({
        ...input,
        actorUserId: ctx.user.id,
      });
      return { ok: true };
    }),

  /** Recent events for the actor (debug/insights views). */
  list: authenticatedProcedure
    .meta({
      openapi: { method: "GET", path: getPath("/events"), tags: TAGS },
    })
    .input(listEventsSchema)
    .output(z.array(analyticsEventSchema))
    .query(async ({ input, ctx }) => {
      return listEvents({
        actorUserId: ctx.user.id,
        spaceId: input.spaceId,
        limit: input.limit,
      });
    }),
});
