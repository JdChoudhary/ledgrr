import { z } from "../../schema";
import { router, authenticatedProcedure } from "../../trpc";
import { generatePath } from "../../utils/path-generator";
import { getUserSettings, updateUserSettings } from "@repo/services/user-settings";

import { getUserSettingsSchema, updateUserSettingsSchema } from "./model";

const TAGS = ["User Settings"] as string[];
const getPath = generatePath("/user-settings");

// ---------------------------------------------------------------------------
// Response schemas (for OpenAPI)
// ---------------------------------------------------------------------------

const userSettingsResponseSchema = z.object({
  id: z.string(),
  userId: z.string(),
  displayCurrency: z.string(),
  locale: z.string(),
  timezone: z.string(),
  dateFormat: z.string(),
  weekStartDay: z.number(),
  theme: z.string(),
  defaultSpaceId: z.string().nullable(),
  autoPostRecurringTransactions: z.boolean(),
  highSpendThreshold: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

export const userSettingsRouter = router({
  get: authenticatedProcedure
    .meta({ openapi: { method: "GET", path: getPath(""), tags: TAGS } })
    .input(getUserSettingsSchema)
    .output(userSettingsResponseSchema)
    .query(async ({ ctx }) => {
      const result = await getUserSettings({ actorUserId: ctx.user.id });
      return result;
    }),

  update: authenticatedProcedure
    .meta({ openapi: { method: "PATCH", path: getPath(""), tags: TAGS } })
    .input(updateUserSettingsSchema)
    .output(userSettingsResponseSchema)
    .mutation(async ({ input, ctx }) => {
      const result = await updateUserSettings({ ...input, actorUserId: ctx.user.id });
      return result;
    }),
});
