import { z } from "zod";
import { router, authenticatedProcedure } from "../../trpc";
import { generatePath } from "../../utils/path-generator";
import { getProfile, isUsernameAvailable } from "@repo/services/profile";

const TAGS = ["Profile"] as string[];
const getPath = generatePath("/profile");

const profileResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  emailVerified: z.boolean(),
  image: z.string().nullable(),
  username: z.string().nullable(),
  displayUsername: z.string().nullable(),
  createdAt: z.date(),
});

export const profileRouter = router({
  get: authenticatedProcedure
    .meta({ openapi: { method: "GET", path: getPath(""), tags: TAGS } })
    .input(z.void())
    .output(profileResponseSchema)
    .query(async ({ ctx }) => {
      return getProfile({ actorUserId: ctx.user.id });
    }),

  checkUsername: authenticatedProcedure
    .meta({
      openapi: { method: "GET", path: getPath("/username-check"), tags: TAGS },
    })
    .input(z.object({ username: z.string().trim().min(3).max(30) }))
    .output(z.object({ available: z.boolean() }))
    .query(async ({ input, ctx }) => {
      return isUsernameAvailable({
        actorUserId: ctx.user.id,
        username: input.username,
      });
    }),
});
