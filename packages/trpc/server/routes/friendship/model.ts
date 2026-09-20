import { z } from "zod";
import { userIdSchema, uuidSchema } from "@repo/services/lib/schema";
import { friendshipStatusSchema } from "@repo/services/friendship/model";

// The combined people-search result shape lives with the contacts router
// (it describes users + contacts); re-exported here for the friend search.
export { personResultSchema } from "../contacts/model";

// -------------------------------------------------------------------
// Friendship
// -------------------------------------------------------------------

export const sendFriendRequestSchema = z.object({
  targetUserId: userIdSchema,
}).refine((v) => v.targetUserId !== "self", {
  // Real self-check happens at service level with actorUserId
  message: "Cannot send a friend request to yourself",
});

export const respondToFriendRequestSchema = z.object({
  friendshipId: uuidSchema,
  status: z.enum(["accepted", "rejected", "blocked"]),
});

export const removeFriendSchema = z.object({
  friendshipId: uuidSchema,
});

export const blockUserSchema = z.object({
  targetUserId: userIdSchema,
});

export const unblockUserSchema = z.object({
  targetUserId: userIdSchema,
});

export const listFriendshipsSchema = z.object({
  status: friendshipStatusSchema.optional(),
});

export const searchUsersSchema = z.object({
  query: z.string().trim().min(1).max(100),
  limit: z.coerce.number().int().min(1).max(50).optional(),
});

// -------------------------------------------------------------------
// Response schemas
// -------------------------------------------------------------------

export const friendProfileSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  image: z.string().nullable(),
  username: z.string().nullable(),
});

export const enrichedFriendshipSchema = z.object({
  friendshipId: z.string().uuid(),
  status: friendshipStatusSchema,
  direction: z.enum(["incoming", "outgoing"]),
  createdAt: z.date(),
  updatedAt: z.date(),
  otherUser: friendProfileSchema,
});
