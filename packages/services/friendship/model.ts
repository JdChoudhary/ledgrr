import { z } from "zod";
import { userIdSchema, uuidSchema } from "../lib/schema";

/**
 * Input contracts for the friendship service.
 *
 * Friendship is SOCIAL only: it never grants financial access.
 * The unique pair constraint uses least/greatest so the order of
 * requester_id / addressee_id doesn't matter.
 */

export const friendshipStatusSchema = z.enum([
  "pending",
  "accepted",
  "rejected",
  "blocked",
]);

export type FriendshipStatus = z.infer<typeof friendshipStatusSchema>;

// -------------------------------------------------------------------
// Request
// -------------------------------------------------------------------

export const sendFriendRequestInputSchema = z.object({
  actorUserId: userIdSchema,
  targetUserId: userIdSchema,
}).refine((v) => v.actorUserId !== v.targetUserId, {
  message: "Cannot send a friend request to yourself",
});

export type SendFriendRequestInput = z.input<typeof sendFriendRequestInputSchema>;

// -------------------------------------------------------------------
// Respond (accept / reject / block)
// -------------------------------------------------------------------

export const respondToFriendRequestInputSchema = z.object({
  actorUserId: userIdSchema,
  friendshipId: uuidSchema,
  status: z.enum(["accepted", "rejected", "blocked"]),
});

export type RespondToFriendRequestInput = z.input<typeof respondToFriendRequestInputSchema>;

// -------------------------------------------------------------------
// Remove
// -------------------------------------------------------------------

export const removeFriendInputSchema = z.object({
  actorUserId: userIdSchema,
  friendshipId: uuidSchema,
});

export type RemoveFriendInput = z.input<typeof removeFriendInputSchema>;

// -------------------------------------------------------------------
// List
// -------------------------------------------------------------------

export const listFriendshipsInputSchema = z.object({
  actorUserId: userIdSchema,
  status: friendshipStatusSchema.optional(),
});

export type ListFriendshipsInput = z.input<typeof listFriendshipsInputSchema>;

// -------------------------------------------------------------------
// User search (for the friends page picker)
// -------------------------------------------------------------------

export const searchUsersInputSchema = z.object({
  actorUserId: userIdSchema,
  /** Matches name, username, or email, case-insensitive. */
  query: z.string().trim().min(1).max(120),
  limit: z.number().int().min(1).max(20).optional().default(10),
});

export type SearchUsersInput = z.input<typeof searchUsersInputSchema>;

// -------------------------------------------------------------------
// Block / Unblock
// -------------------------------------------------------------------

export const blockUserInputSchema = z.object({
  actorUserId: userIdSchema,
  targetUserId: userIdSchema,
}).refine((v) => v.actorUserId !== v.targetUserId, {
  message: "Cannot block yourself",
});

export type BlockUserInput = z.input<typeof blockUserInputSchema>;

export const unblockUserInputSchema = z
  .object({
    actorUserId: userIdSchema,
    targetUserId: userIdSchema,
  })
  .refine((v) => v.actorUserId !== v.targetUserId, {
    message: "Cannot unblock yourself",
  });

export type UnblockUserInput = z.input<typeof unblockUserInputSchema>;
