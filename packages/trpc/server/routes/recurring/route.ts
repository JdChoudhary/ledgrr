import { z } from "zod";
import { uuidSchema } from "@repo/services/lib/schema";
import { router, authenticatedProcedure } from "../../trpc";
import { generatePath } from "../../utils/path-generator";
import {
  createRule,
  listRules,
  listOccurrences,
  listProjectedOccurrences,
  confirmOccurrence,
  skipOccurrence,
  updateRuleStatus,
  listRuleLogs,
  runDueRules,
} from "@repo/services/recurring";

import {
  createRuleSchema,
  listRulesSchema,
  listOccurrencesSchema,
  confirmOccurrenceSchema,
  skipOccurrenceSchema,
  ruleStatusSchema,
  ruleLogLookupSchema,
  ruleResponseSchema,
  ruleLogResponseSchema,
  occurrenceResponseSchema,
  projectedOccurrenceResponseSchema,
} from "./model";

const TAGS = ["Recurring"] as string[];
const getPath = generatePath("/recurring");

const catchUpInputSchema = z.object({
  spaceId: uuidSchema,
});

const catchUpOutputSchema = z.object({
  posted: z.number().int(),
  logged: z.number().int(),
  failed: z.number().int(),
});

export const recurringRouter = router({
  // -- Lazy catch-up -----------------------------------------------------------
  // Posts every due occurrence for this space. Idempotent — safe to call on
  // every app load; a background scheduler can call the same service entry.

  catchUp: authenticatedProcedure
    .meta({
      openapi: { method: "POST", path: getPath("/catch-up"), tags: TAGS },
    })
    .input(catchUpInputSchema)
    .output(catchUpOutputSchema)
    .mutation(async ({ input, ctx }) => {
      return runDueRules({ spaceId: input.spaceId, actorUserId: ctx.user.id });
    }),
  // -- Create -----------------------------------------------------------------

  create: authenticatedProcedure
    .meta({ openapi: { method: "POST", path: getPath(""), tags: TAGS } })
    .input(createRuleSchema)
    .output(ruleResponseSchema)
    .mutation(async ({ input, ctx }) => {
      const rule = await createRule({
        ...input,
        actorUserId: ctx.user.id,
      });
      return rule;
    }),

  // -- List --------------------------------------------------------------------

  list: authenticatedProcedure
    .meta({ openapi: { method: "GET", path: getPath(""), tags: TAGS } })
    .input(listRulesSchema)
    .output(ruleResponseSchema.array())
    .query(async ({ input, ctx }) => {
      const rules = await listRules({
        ...input,
        actorUserId: ctx.user.id,
      });
      return rules;
    }),

  // -- Status transitions ---------------------------------------------------------
  // All three share one service entry; the route pins the target status.

  pause: authenticatedProcedure
    .meta({
      openapi: { method: "POST", path: getPath("/{ruleId}/pause"), tags: TAGS },
    })
    .input(ruleStatusSchema)
    .output(ruleResponseSchema)
    .mutation(async ({ input, ctx }) => {
      const rule = await updateRuleStatus({
        ruleId: input.ruleId,
        actorUserId: ctx.user.id,
        status: "paused",
      });
      return rule;
    }),

  resume: authenticatedProcedure
    .meta({
      openapi: { method: "POST", path: getPath("/{ruleId}/resume"), tags: TAGS },
    })
    .input(ruleStatusSchema)
    .output(ruleResponseSchema)
    .mutation(async ({ input, ctx }) => {
      const rule = await updateRuleStatus({
        ruleId: input.ruleId,
        actorUserId: ctx.user.id,
        status: "active",
      });
      return rule;
    }),

  cancel: authenticatedProcedure
    .meta({
      openapi: { method: "POST", path: getPath("/{ruleId}/cancel"), tags: TAGS },
    })
    .input(ruleStatusSchema)
    .output(ruleResponseSchema)
    .mutation(async ({ input, ctx }) => {
      const rule = await updateRuleStatus({
        ruleId: input.ruleId,
        actorUserId: ctx.user.id,
        status: "cancelled",
      });
      return rule;
    }),

  // -- Occurrences (calendar view) -------------------------------------------

  listOccurrences: authenticatedProcedure
    .meta({ openapi: { method: "GET", path: getPath("/occurrences"), tags: TAGS } })
    .input(listOccurrencesSchema)
    .output(occurrenceResponseSchema.array())
    .query(async ({ input, ctx }) => {
      return listOccurrences({
        ...input,
        actorUserId: ctx.user.id,
      });
    }),

  /**
   * The dates each active rule is due on in a month, projected from its
   * schedule (start/end dates included). Occurrence rows only exist after a
   * rule has come due, so this is what fills the calendar's future months.
   */
  projectedOccurrences: authenticatedProcedure
    .meta({ openapi: { method: "GET", path: getPath("/occurrences/projected"), tags: TAGS } })
    .input(listOccurrencesSchema)
    .output(projectedOccurrenceResponseSchema.array())
    .query(async ({ input, ctx }) => {
      return listProjectedOccurrences({
        ...input,
        actorUserId: ctx.user.id,
      });
    }),

  confirmOccurrence: authenticatedProcedure
    .meta({ openapi: { method: "POST", path: getPath("/occurrences/confirm"), tags: TAGS } })
    .input(confirmOccurrenceSchema)
    .output(z.object({ id: z.string(), transactionId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      return confirmOccurrence({
        ...input,
        actorUserId: ctx.user.id,
      });
    }),

  skipOccurrence: authenticatedProcedure
    .meta({ openapi: { method: "POST", path: getPath("/occurrences/skip"), tags: TAGS } })
    .input(skipOccurrenceSchema)
    .output(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      return skipOccurrence({
        ...input,
        actorUserId: ctx.user.id,
      });
    }),

  // -- Logs -------------------------------------------------------------------

  logs: authenticatedProcedure
    .meta({
      openapi: { method: "GET", path: getPath("/{ruleId}/logs"), tags: TAGS },
    })
    .input(ruleLogLookupSchema)
    .output(ruleLogResponseSchema.array())
    .query(async ({ input }) => {
      return listRuleLogs(input.ruleId);
    }),
});
