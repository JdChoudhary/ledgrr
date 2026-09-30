import { z } from "../../schema";
import { router, authenticatedProcedure } from "../../trpc";
import { generatePath } from "../../utils/path-generator";
import {
  createGoal,
  getGoal,
  listGoals,
  updateGoal,
  completeGoal,
  cancelGoal,
  contributeToGoal,
  listGoalContributions,
} from "@repo/services/goal";

import {
  createGoalSchema,
  updateGoalSchema,
  goalLookupSchema,
  listGoalsSchema,
  contributeToGoalSchema,
  listGoalContributionsSchema,
  contributionResultResponseSchema,
  goalContributionResponseSchema,
} from "./model";

const TAGS = ["Goals"] as string[];
const getPath = generatePath("/goals");

// ---------------------------------------------------------------------------
// Response schemas (for OpenAPI)
// ---------------------------------------------------------------------------

const goalResponseSchema = z.object({
  id: z.string(),
  userId: z.string(),
  createdBy: z.string(),
  linkedAccountId: z.string().nullable(),
  name: z.string(),
  targetAmount: z.string(),
  currentAmount: z.string(),
  currency: z.string(),
  targetDate: z.string().nullable(),
  completedAt: z.string().nullable(),
  cancelledAt: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

export const goalRouter = router({
  // -- CRUD ------------------------------------------------------------------

  create: authenticatedProcedure
    .meta({ openapi: { method: "POST", path: getPath(""), tags: TAGS } })
    .input(createGoalSchema)
    .output(goalResponseSchema)
    .mutation(async ({ input, ctx }) => {
      const result = await createGoal({ ...input, actorUserId: ctx.user.id });
      return result as z.infer<typeof goalResponseSchema>;
    }),

  get: authenticatedProcedure
    .meta({ openapi: { method: "GET", path: getPath("/{goalId}"), tags: TAGS } })
    .input(goalLookupSchema)
    .output(goalResponseSchema)
    .query(async ({ input, ctx }) => {
      const result = await getGoal({ ...input, actorUserId: ctx.user.id });
      return result as z.infer<typeof goalResponseSchema>;
    }),

  list: authenticatedProcedure
    .meta({ openapi: { method: "GET", path: getPath(""), tags: TAGS } })
    .input(listGoalsSchema)
    .output(z.array(goalResponseSchema))
    .query(async ({ input, ctx }) => {
      const results = await listGoals({ ...input, actorUserId: ctx.user.id });
      return [...results].map((r) => r as z.infer<typeof goalResponseSchema>);
    }),

  update: authenticatedProcedure
    .meta({ openapi: { method: "PATCH", path: getPath("/{goalId}"), tags: TAGS } })
    .input(updateGoalSchema)
    .output(goalResponseSchema)
    .mutation(async ({ input, ctx }) => {
      const result = await updateGoal({ ...input, actorUserId: ctx.user.id });
      return result as z.infer<typeof goalResponseSchema>;
    }),

  // -- State transitions -----------------------------------------------------

  complete: authenticatedProcedure
    .meta({
      openapi: { method: "POST", path: getPath("/{goalId}/complete"), tags: TAGS },
    })
    .input(goalLookupSchema)
    .output(goalResponseSchema)
    .mutation(async ({ input, ctx }) => {
      const result = await completeGoal({ ...input, actorUserId: ctx.user.id });
      return result as z.infer<typeof goalResponseSchema>;
    }),  cancel: authenticatedProcedure
    .meta({
      openapi: { method: "POST", path: getPath("/{goalId}/cancel"), tags: TAGS },
    })
    .input(goalLookupSchema)
    .output(goalResponseSchema)
    .mutation(async ({ input, ctx }) => {
      const result = await cancelGoal({ ...input, actorUserId: ctx.user.id });
      return result as z.infer<typeof goalResponseSchema>;
    }),

  // -- Contributions (deposit/withdrawal saving) ---------------------------------
  // Separate from the main transactions table; balances are not modified.

  contribute: authenticatedProcedure
    .meta({
      openapi: { method: "POST", path: getPath("/{goalId}/contributions"), tags: TAGS },
    })
    .input(contributeToGoalSchema)
    .output(contributionResultResponseSchema)
    .mutation(async ({ input, ctx }) => {
      const result = await contributeToGoal({ ...input, actorUserId: ctx.user.id });
      return result as z.infer<typeof contributionResultResponseSchema>;
    }),

  listContributions: authenticatedProcedure
    .meta({
      openapi: { method: "GET", path: getPath("/{goalId}/contributions"), tags: TAGS },
    })
    .input(listGoalContributionsSchema)
    .output(z.array(goalContributionResponseSchema))
    .query(async ({ input, ctx }) => {
      const results = await listGoalContributions({
        ...input,
        actorUserId: ctx.user.id,
      });
      return [...results].map((r) => r as z.infer<typeof goalContributionResponseSchema>);
    }),

});
