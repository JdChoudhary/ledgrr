import { z } from "../../schema";
import { router, authenticatedProcedure } from "../../trpc";
import { generatePath } from "../../utils/path-generator";
import {
  sendFriendRequest,
  respondToFriendRequest,
  removeFriend,
  blockUser,
  unblockUser,
  listFriendshipsWithProfiles,
  searchUsers,
} from "@repo/services/friendship";
import { searchPeople } from "@repo/services/contacts";

import {
  sendFriendRequestSchema,
  respondToFriendRequestSchema,
  removeFriendSchema,
  blockUserSchema,
  unblockUserSchema,
  listFriendshipsSchema,
  searchUsersSchema,
  enrichedFriendshipSchema,
  friendProfileSchema,
  personResultSchema,
} from "./model";

const TAGS = ["Friends"] as string[];
const getPath = generatePath("/friends");

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

export const friendshipRouter = router({
  // -- Request ----------------------------------------------------------------

  sendRequest: authenticatedProcedure
    .meta({ openapi: { method: "POST", path: getPath("/request"), tags: TAGS } })
    .input(sendFriendRequestSchema)
    .output(enrichedFriendshipSchema)
    .mutation(async ({ input, ctx }) => {
      const result = await sendFriendRequest({
        ...input,
        actorUserId: ctx.user.id,
      });
      // Re-fetch with profile enrichment so the client gets a full record.
      const [enriched] = await listFriendshipsWithProfiles({
        actorUserId: ctx.user.id,
      }).then((rows) => rows.filter((r) => r.friendshipId === result.id));
      if (!enriched) {
        // Fallback: map the raw row (otherUser unavailable is practically
        // impossible — the target user exists by FK).
        return {
          friendshipId: result.id,
          status: result.status,
          direction: result.requesterId === ctx.user.id ? "outgoing" : "incoming",
          createdAt: result.createdAt,
          updatedAt: result.updatedAt,
          otherUser: {
            id: input.targetUserId,
            name: "",
            email: "",
            image: null,
            username: null,
          },
        } as z.infer<typeof enrichedFriendshipSchema>;
      }
      return enriched;
    }),

  // -- Respond ----------------------------------------------------------------

  respond: authenticatedProcedure
    .meta({
      openapi: {
        method: "PATCH",
        path: getPath("/request/{friendshipId}"),
        tags: TAGS,
      },
    })
    .input(respondToFriendRequestSchema)
    .output(enrichedFriendshipSchema)
    .mutation(async ({ input, ctx }) => {
      const result = await respondToFriendRequest({
        ...input,
        actorUserId: ctx.user.id,
      });
      const [enriched] = await listFriendshipsWithProfiles({
        actorUserId: ctx.user.id,
      }).then((rows) => rows.filter((r) => r.friendshipId === result.id));
      if (!enriched) {
        return {
          friendshipId: result.id,
          status: result.status,
          direction: result.requesterId === ctx.user.id ? "outgoing" : "incoming",
          createdAt: result.createdAt,
          updatedAt: result.updatedAt,
          otherUser: {
            id: result.requesterId === ctx.user.id ? result.addresseeId : result.requesterId,
            name: "",
            email: "",
            image: null,
            username: null,
          },
        } as z.infer<typeof enrichedFriendshipSchema>;
      }
      return enriched;
    }),

  // -- Remove -----------------------------------------------------------------

  remove: authenticatedProcedure
    .meta({
      openapi: {
        method: "DELETE",
        path: getPath("/{friendshipId}"),
        tags: TAGS,
      },
    })
    .input(removeFriendSchema)
    .output(enrichedFriendshipSchema)
    .mutation(async ({ input, ctx }) => {
      const result = await removeFriend({
        ...input,
        actorUserId: ctx.user.id,
      });
      const [enriched] = await listFriendshipsWithProfiles({
        actorUserId: ctx.user.id,
      }).then((rows) => rows.filter((r) => r.friendshipId === result.id));
      if (!enriched) {
        return {
          friendshipId: result.id,
          status: result.status,
          direction: result.requesterId === ctx.user.id ? "outgoing" : "incoming",
          createdAt: result.createdAt,
          updatedAt: result.updatedAt,
          otherUser: {
            id: result.requesterId === ctx.user.id ? result.addresseeId : result.requesterId,
            name: "",
            email: "",
            image: null,
            username: null,
          },
        } as z.infer<typeof enrichedFriendshipSchema>;
      }
      return enriched;
    }),

  // -- Block ------------------------------------------------------------------

  block: authenticatedProcedure
    .meta({ openapi: { method: "POST", path: getPath("/block"), tags: TAGS } })
    .input(blockUserSchema)
    .output(enrichedFriendshipSchema)
    .mutation(async ({ input, ctx }) => {
      const result = await blockUser({
        ...input,
        actorUserId: ctx.user.id,
      });
      const [enriched] = await listFriendshipsWithProfiles({
        actorUserId: ctx.user.id,
      }).then((rows) => rows.filter((r) => r.friendshipId === result.id));
      if (!enriched) {
        return {
          friendshipId: result.id,
          status: result.status,
          direction: result.requesterId === ctx.user.id ? "outgoing" : "incoming",
          createdAt: result.createdAt,
          updatedAt: result.updatedAt,
          otherUser: {
            id: input.targetUserId,
            name: "",
            email: "",
            image: null,
            username: null,
          },
        } as z.infer<typeof enrichedFriendshipSchema>;
      }
      return enriched;
    }),

  // -- Unblock -----------------------------------------------------------------

  unblock: authenticatedProcedure
    .meta({ openapi: { method: "POST", path: getPath("/unblock"), tags: TAGS } })
    .input(unblockUserSchema)
    .output(enrichedFriendshipSchema)
    .mutation(async ({ input, ctx }) => {
      const result = await unblockUser({
        ...input,
        actorUserId: ctx.user.id,
      });
      const [enriched] = await listFriendshipsWithProfiles({
        actorUserId: ctx.user.id,
      }).then((rows) => rows.filter((r) => r.friendshipId === result.id));
      if (!enriched) {
        return {
          friendshipId: result.id,
          status: result.status,
          direction: result.requesterId === ctx.user.id ? "outgoing" : "incoming",
          createdAt: result.createdAt,
          updatedAt: result.updatedAt,
          otherUser: {
            id: input.targetUserId,
            name: "",
            email: "",
            image: null,
            username: null,
          },
        } as z.infer<typeof enrichedFriendshipSchema>;
      }
      return enriched;
    }),

  // -- List (enriched) ----------------------------------------------------------

  list: authenticatedProcedure
    .meta({ openapi: { method: "GET", path: getPath(""), tags: TAGS } })
    .input(listFriendshipsSchema)
    .output(z.array(enrichedFriendshipSchema))
    .query(async ({ input, ctx }) => {
      const results = await listFriendshipsWithProfiles({
        ...input,
        actorUserId: ctx.user.id,
      });
      return [...results].map((r) => r as z.infer<typeof enrichedFriendshipSchema>);
    }),

  // -- People search — registered users + the actor's contacts -------------------

  searchUsers: authenticatedProcedure
    .meta({ openapi: { method: "GET", path: getPath("/search"), tags: TAGS } })
    .input(searchUsersSchema)
    .output(z.array(personResultSchema))
    .query(async ({ input, ctx }) => {
      const results = await searchPeople(
        ctx.user.id,
        input.query,
        input.limit ?? 10,
      );
      return [...results].map((r) => r as z.infer<typeof personResultSchema>);
    }),
});
