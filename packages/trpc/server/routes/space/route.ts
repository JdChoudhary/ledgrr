import { z, zodUndefinedModel } from "../../schema";
import { router, authenticatedProcedure } from "../../trpc";
import { generatePath } from "../../utils/path-generator";
import {
  createPersonalSpace,
  createSharedSpace,
  getSpace,
  listSpacesForUser,
  listSpaceMembers,
  updateSpace,
  archiveSpace,
  unarchiveSpace,
  addSpaceMember,
  updateSpaceMemberRole,
  removeSpaceMember,
} from "@repo/services/space";
import { spaceMemberRoleSchema, type SpaceMemberRole } from "@repo/services/space/model";

import {
  createPersonalSpaceSchema,
  createSharedSpaceSchema,
  getSpaceSchema,
  listSpacesSchema,
  updateSpaceSchema,
  archiveSpaceSchema,
  listSpaceMembersSchema,
  addSpaceMemberSchema,
  updateSpaceMemberRoleSchema,
  removeSpaceMemberSchema,
} from "./model";

const TAGS = ["Space"];
const getPath = generatePath("/spaces");

// ---------------------------------------------------------------------------
// Response schemas (for OpenAPI)
// ---------------------------------------------------------------------------

const spaceResponseSchema = z.object({
  id: z.string(),
  ownerId: z.string(),
  type: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  baseCurrency: z.string(),
  sharedLedger: z.boolean(),
  sharedAccounts: z.boolean(),
  billSplitting: z.boolean(),
  budgeting: z.boolean(),
  goalsEnabled: z.boolean(),
  archivedAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

const spaceMemberResponseSchema = z.object({
  id: z.string(),
  spaceId: z.string(),
  userId: z.string(),
  role: z.string(),
  defaultAccountId: z.string().nullable(),
  invitedBy: z.string().nullable(),
  joinedAt: z.string().nullable(),
  removedAt: z.string().nullable(),
  createdAt: z.date(),
  // Identity from the user table (null for ghost/deleted users).
  memberName: z.string().nullable(),
  memberEmail: z.string().nullable(),
  memberImage: z.string().nullable(),
  memberUsername: z.string().nullable(),
});

const listSpacesResponseSchema = z.array(
  z.object({
    space: spaceResponseSchema,
    role: z.string(),
    membershipId: z.string(),
  }),
);

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

export const spaceRouter = router({
  // -- Create ----------------------------------------------------------------

  createPersonalSpace: authenticatedProcedure
    .meta({ openapi: { method: "POST", path: getPath("/personal"), tags: TAGS } })
    .input(createPersonalSpaceSchema)
    .output(spaceResponseSchema)
    .mutation(async ({ input, ctx }) => {
      const result = await createPersonalSpace({ ...input, userId: ctx.user.id });
      return result;
    }),

  createSharedSpace: authenticatedProcedure
    .meta({ openapi: { method: "POST", path: getPath(""), tags: TAGS } })
    .input(createSharedSpaceSchema)
    .output(spaceResponseSchema)
    .mutation(async ({ input, ctx }) => {
      const result = await createSharedSpace({ ...input, ownerId: ctx.user.id });
      return result;
    }),

  // -- Read ------------------------------------------------------------------

  getSpace: authenticatedProcedure
    .meta({ openapi: { method: "GET", path: getPath("/{spaceId}"), tags: TAGS } })
    .input(getSpaceSchema)
    .output(spaceResponseSchema.nullable())
    .query(async ({ input, ctx }) => {
      const result = await getSpace({ ...input, userId: ctx.user.id });
      return result;
    }),

  listSpaces: authenticatedProcedure
    .meta({ openapi: { method: "GET", path: getPath(""), tags: TAGS } })
    .input(listSpacesSchema)
    .output(listSpacesResponseSchema)
    .query(async ({ input, ctx }) => {
      const results = await listSpacesForUser({ ...input, userId: ctx.user.id });
      return results.map((r) => ({
        space: r.space as z.infer<typeof spaceResponseSchema>,
        role: r.role,
        membershipId: r.membershipId,
      }));
    }),

  listSpaceMembers: authenticatedProcedure
    .meta({ openapi: { method: "GET", path: getPath("/{spaceId}/members"), tags: TAGS } })
    .input(listSpaceMembersSchema)
    .output(z.array(spaceMemberResponseSchema))
    .query(async ({ input, ctx }) => {
      const results = await listSpaceMembers({ ...input, userId: ctx.user.id });
      return results.map((r) => r as z.infer<typeof spaceMemberResponseSchema>);
    }),

  // -- Update ----------------------------------------------------------------

  updateSpace: authenticatedProcedure
    .meta({ openapi: { method: "PATCH", path: getPath("/{spaceId}"), tags: TAGS } })
    .input(updateSpaceSchema)
    .output(spaceResponseSchema)
    .mutation(async ({ input, ctx }) => {
      const result = await updateSpace({ ...input, actorUserId: ctx.user.id });
      return result as z.infer<typeof spaceResponseSchema>;
    }),

  archiveSpace: authenticatedProcedure
    .meta({ openapi: { method: "POST", path: getPath("/{spaceId}/archive"), tags: TAGS } })
    .input(archiveSpaceSchema)
    .output(spaceResponseSchema)
    .mutation(async ({ input, ctx }) => {
      const result = await archiveSpace({ ...input, actorUserId: ctx.user.id });
      return result as z.infer<typeof spaceResponseSchema>;
    }),

  unarchiveSpace: authenticatedProcedure
    .meta({ openapi: { method: "POST", path: getPath("/{spaceId}/unarchive"), tags: TAGS } })
    .input(archiveSpaceSchema)
    .output(spaceResponseSchema)
    .mutation(async ({ input, ctx }) => {
      const result = await unarchiveSpace({ ...input, actorUserId: ctx.user.id });
      return result as z.infer<typeof spaceResponseSchema>;
    }),

  // -- Membership ------------------------------------------------------------

  addSpaceMember: authenticatedProcedure
    .meta({ openapi: { method: "POST", path: getPath("/{spaceId}/members"), tags: TAGS } })
    .input(addSpaceMemberSchema)
    .output(spaceMemberResponseSchema)
    .mutation(async ({ input, ctx }) => {
      const result = await addSpaceMember({ ...input, actorUserId: ctx.user.id });
      return result as z.infer<typeof spaceMemberResponseSchema>;
    }),

  updateSpaceMemberRole: authenticatedProcedure
    .meta({
      openapi: {
        method: "PATCH",
        path: getPath("/{spaceId}/members/{userId}"),
        tags: TAGS,
      },
    })
    .input(updateSpaceMemberRoleSchema)
    .output(spaceMemberResponseSchema)
    .mutation(async ({ input, ctx }) => {
      const result = await updateSpaceMemberRole({ ...input, actorUserId: ctx.user.id });
      return result as z.infer<typeof spaceMemberResponseSchema>;
    }),

  removeSpaceMember: authenticatedProcedure
    .meta({
      openapi: {
        method: "DELETE",
        path: getPath("/{spaceId}/members/{userId}"),
        tags: TAGS,
      },
    })
    .input(removeSpaceMemberSchema)
    .output(spaceMemberResponseSchema)
    .mutation(async ({ input, ctx }) => {
      const result = await removeSpaceMember({ ...input, actorUserId: ctx.user.id });
      return result as z.infer<typeof spaceMemberResponseSchema>;
    }),
});
