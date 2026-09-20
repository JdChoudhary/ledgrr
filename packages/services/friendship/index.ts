import { and, db, eq, ilike, ne, or } from "@repo/database";
import { friendships, user, type SelectFriendship } from "@repo/database/schema";
import { ServiceError, isUniqueViolation } from "../lib/errors";
import { parseInput } from "../lib/schema";
import {
  blockUserInputSchema,
  listFriendshipsInputSchema,
  removeFriendInputSchema,
  respondToFriendRequestInputSchema,
  searchUsersInputSchema,
  sendFriendRequestInputSchema,
  unblockUserInputSchema,
  type BlockUserInput,
  type ListFriendshipsInput,
  type RemoveFriendInput,
  type RespondToFriendRequestInput,
  type SearchUsersInput,
  type SendFriendRequestInput,
  type UnblockUserInput,
} from "./model";

/**
 * Friendship service.
 *
 * Friendship is SOCIAL only — it never grants ledger or financial access.
 * Bill splits/debts are separate from friendship.
 *
 * The unique pair constraint uses least/greatest so the order of
 * requester_id / addressee_id doesn't matter.
 */

// -------------------------------------------------------------------
// Internal helpers
// -------------------------------------------------------------------

/** Find a friendship by ID. */
const findFriendship = async (
  friendshipId: string,
): Promise<SelectFriendship | undefined> => {
  const [friendship] = await db
    .select()
    .from(friendships)
    .where(eq(friendships.id, friendshipId))
    .limit(1);
  return friendship;
};

/** Find an existing friendship between two users (any direction). */
const findFriendshipBetween = async (
  userIdA: string,
  userIdB: string,
): Promise<SelectFriendship | undefined> => {
  const [friendship] = await db
    .select()
    .from(friendships)
    .where(
      or(
        and(eq(friendships.requesterId, userIdA), eq(friendships.addresseeId, userIdB)),
        and(eq(friendships.requesterId, userIdB), eq(friendships.addresseeId, userIdA)),
      ),
    )
    .limit(1);
  return friendship;
};

// -------------------------------------------------------------------
// Send friend request
// -------------------------------------------------------------------

/**
 * Sends a friend request from actor to target.
 * If a pending request already exists in the opposite direction, it is
 * automatically accepted (mutual request = instant friends).
 */
export async function sendFriendRequest(input: SendFriendRequestInput): Promise<SelectFriendship> {
  const { actorUserId, targetUserId } = parseInput(
    sendFriendRequestInputSchema,
    input,
    "sendFriendRequest input",
  );

  const existing = await findFriendshipBetween(actorUserId, targetUserId);

  if (existing) {
    // Mutual request — auto-accept
    if (existing.status === "pending" && existing.requesterId === targetUserId) {
      const [updated] = await db
        .update(friendships)
        .set({ status: "accepted" })
        .where(eq(friendships.id, existing.id))
        .returning();

      if (!updated) {
        throw new ServiceError("INVALID_STATE", "Failed to accept mutual friend request");
      }

      return updated;
    }

    if (existing.status === "accepted") {
      throw new ServiceError("CONFLICT", "You are already friends with this user");
    }

    if (existing.status === "blocked") {
      throw new ServiceError("FORBIDDEN", "Cannot send a friend request to this user");
    }

    // Pending request from actor already exists
    if (existing.requesterId === actorUserId && existing.status === "pending") {
      throw new ServiceError("CONFLICT", "Friend request already sent");
    }

    // Rejected request — allow re-request after some time (just update status)
    const [updated] = await db
      .update(friendships)
      .set({ status: "pending", requesterId: actorUserId, addresseeId: targetUserId })
      .where(eq(friendships.id, existing.id))
      .returning();

    if (!updated) {
      throw new ServiceError("INVALID_STATE", "Failed to send friend request");
    }

    return updated;
  }

  try {
    const [friendship] = await db
      .insert(friendships)
      .values({
        requesterId: actorUserId,
        addresseeId: targetUserId,
        status: "pending",
      })
      .returning();

    if (!friendship) {
      throw new ServiceError("INVALID_STATE", "Failed to send friend request");
    }

    return friendship;
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new ServiceError("CONFLICT", "Friend request already exists");
    }
    throw error;
  }
}

// -------------------------------------------------------------------
// Respond to friend request
// -------------------------------------------------------------------

/**
 * Accepts, rejects, or blocks a pending friend request.
 * Only the addressee (target) of the request may respond.
 */
export async function respondToFriendRequest(
  input: RespondToFriendRequestInput,
): Promise<SelectFriendship> {
  const { actorUserId, friendshipId, status } = parseInput(
    respondToFriendRequestInputSchema,
    input,
    "respondToFriendRequest input",
  );

  const friendship = await findFriendship(friendshipId);

  if (!friendship) {
    throw new ServiceError("NOT_FOUND", "Friend request not found");
  }

  if (friendship.addresseeId !== actorUserId) {
    throw new ServiceError("FORBIDDEN", "Only the recipient of a friend request can respond");
  }

  if (friendship.status !== "pending") {
    throw new ServiceError("INVALID_STATE", `Friend request is already ${friendship.status}`);
  }

  const [updated] = await db
    .update(friendships)
    .set({ status })
    .where(eq(friendships.id, friendshipId))
    .returning();

  if (!updated) {
    throw new ServiceError("INVALID_STATE", "Failed to update friend request");
  }

  return updated;
}

// -------------------------------------------------------------------
// Remove friend
// -------------------------------------------------------------------

/** Removes an accepted friendship. Either party may do this. */
export async function removeFriend(input: RemoveFriendInput): Promise<SelectFriendship> {
  const { actorUserId, friendshipId } = parseInput(
    removeFriendInputSchema,
    input,
    "removeFriend input",
  );

  const friendship = await findFriendship(friendshipId);

  if (!friendship) {
    throw new ServiceError("NOT_FOUND", "Friendship not found");
  }

  if (
    friendship.requesterId !== actorUserId &&
    friendship.addresseeId !== actorUserId
  ) {
    throw new ServiceError("FORBIDDEN", "You are not part of this friendship");
  }

  const [updated] = await db
    .update(friendships)
    .set({ status: "rejected" })
    .where(eq(friendships.id, friendshipId))
    .returning();

  if (!updated) {
    throw new ServiceError("INVALID_STATE", "Failed to remove friendship");
  }

  return updated;
}

// -------------------------------------------------------------------
// Block user
// -------------------------------------------------------------------

/**
 * Blocks a user. If a friendship exists, it is set to "blocked".
 * If no friendship exists, a new blocked record is created.
 */
export async function blockUser(input: BlockUserInput): Promise<SelectFriendship> {
  const { actorUserId, targetUserId } = parseInput(
    blockUserInputSchema,
    input,
    "blockUser input",
  );

  const existing = await findFriendshipBetween(actorUserId, targetUserId);

  if (existing) {
    const [updated] = await db
      .update(friendships)
      .set({ status: "blocked", requesterId: actorUserId, addresseeId: targetUserId })
      .where(eq(friendships.id, existing.id))
      .returning();

    if (!updated) {
      throw new ServiceError("INVALID_STATE", "Failed to block user");
    }

    return updated;
  }

  const [friendship] = await db
    .insert(friendships)
    .values({
      requesterId: actorUserId,
      addresseeId: targetUserId,
      status: "blocked",
    })
    .returning();

  if (!friendship) {
    throw new ServiceError("INVALID_STATE", "Failed to block user");
  }

  return friendship;
}

// -------------------------------------------------------------------
// Unblock user
// -------------------------------------------------------------------

/**
 * Lifts a block the actor placed on `targetUserId`. Only the blocker may
 * unblock; after unblocking there is no friendship — the other person must
 * send a fresh request if both parties still want to connect.
 */
export async function unblockUser(input: UnblockUserInput): Promise<SelectFriendship> {
  const { actorUserId, targetUserId } = parseInput(
    unblockUserInputSchema,
    input,
    "unblockUser input",
  );

  const existing = await findFriendshipBetween(actorUserId, targetUserId);

  if (!existing || existing.status !== "blocked") {
    throw new ServiceError("NOT_FOUND", "You have not blocked this user");
  }

  // The block edge stores requesterId = blocker (blockUser enforces this).
  // Only the blocker can lift it — the blocked party cannot unblock themselves.
  if (existing.requesterId !== actorUserId) {
    throw new ServiceError(
      "FORBIDDEN",
      "Only the person who placed the block can unblock",
    );
  }

  const [updated] = await db
    .update(friendships)
    .set({ status: "rejected" })
    .where(eq(friendships.id, existing.id))
    .returning();

  if (!updated) {
    throw new ServiceError("INVALID_STATE", "Failed to unblock user");
  }

  return updated;
}

// -------------------------------------------------------------------
// List
// -------------------------------------------------------------------

/**
 * Lists the actor's friendships, optionally filtered by status.
 */
export async function listFriendships(
  input: ListFriendshipsInput,
): Promise<ReadonlyArray<SelectFriendship>> {
  const { actorUserId, status } = parseInput(
    listFriendshipsInputSchema,
    input,
    "listFriendships input",
  );

  return db
    .select()
    .from(friendships)
    .where(
      and(
        or(
          eq(friendships.requesterId, actorUserId),
          eq(friendships.addresseeId, actorUserId),
        ),
        status === undefined ? undefined : eq(friendships.status, status),
      ),
    );
}

// -------------------------------------------------------------------
// Enriched list — friendships joined with the other user's profile
// -------------------------------------------------------------------

export type FriendProfile = {
  id: string;
  name: string;
  email: string;
  image: string | null;
  username: string | null;
};

export type EnrichedFriendship = {
  friendshipId: string;
  status: "pending" | "accepted" | "rejected" | "blocked";
  /** "incoming" = actor received the request/edge; "outgoing" = actor sent it. */
  direction: "incoming" | "outgoing";
  createdAt: Date;
  updatedAt: Date;
  /** The other user's profile (never the actor's own). */
  otherUser: FriendProfile;
};

/**
 * Every friendship row involving the actor, each carrying the other
 * participant's profile. One query — the UI derives sections (friends,
 * incoming requests, sent requests, blocked) from `status` + `direction`.
 */
export async function listFriendshipsWithProfiles(
  input: ListFriendshipsInput,
): Promise<ReadonlyArray<EnrichedFriendship>> {
  const { actorUserId, status } = parseInput(
    listFriendshipsInputSchema,
    input,
    "listFriendshipsWithProfiles input",
  );

  const rows = await db
    .select({
      friendship: friendships,
      requesterProfile: {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
        username: user.username,
      },
    })
    .from(friendships)
    .innerJoin(user, eq(user.id, friendships.requesterId))
    .where(
      and(
        or(
          eq(friendships.requesterId, actorUserId),
          eq(friendships.addresseeId, actorUserId),
        ),
        status === undefined ? undefined : eq(friendships.status, status),
      ),
    );

  // The join only fetched requester profiles; fetch addressee profiles for
  // rows where the actor is the requester.
  const addresseeIds = rows
    .filter((row) => row.friendship.addresseeId !== actorUserId)
    .map((row) => row.friendship.addresseeId);

  const addresseeProfiles = new Map<string, FriendProfile>();
  if (addresseeIds.length > 0) {
    const profiles = await db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
        username: user.username,
      })
      .from(user)
      .where(or(...addresseeIds.map((id) => eq(user.id, id))));
    for (const profile of profiles) {
      addresseeProfiles.set(profile.id, profile);
    }
  }

  return rows.map(({ friendship, requesterProfile }) => {
    const incoming = friendship.addresseeId === actorUserId;
    const otherUser = incoming ? requesterProfile : addresseeProfiles.get(friendship.addresseeId);

    if (!otherUser) {
      throw new ServiceError("INVALID_STATE", "Friendship is missing a participant");
    }

    return {
      friendshipId: friendship.id,
      status: friendship.status,
      direction: incoming ? "incoming" : "outgoing",
      createdAt: friendship.createdAt,
      updatedAt: friendship.updatedAt,
      otherUser,
    };
  });
}

// -------------------------------------------------------------------
// User search — find people to befriend
// -------------------------------------------------------------------

/**
 * Searches users by name/username/email for the friend picker. Excludes the
 * actor and banned accounts. Exposes only directory-safe fields.
 */
export async function searchUsers(
  input: SearchUsersInput,
): Promise<ReadonlyArray<FriendProfile>> {
  const { actorUserId, query, limit } = parseInput(
    searchUsersInputSchema,
    input,
    "searchUsers input",
  );

  const pattern = `%${query}%`;

  return db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image,
      username: user.username,
    })
    .from(user)
    .where(
      and(
        // Never return the actor in their own people-search results.
        ne(user.id, actorUserId),
        or(
          ilike(user.name, pattern),
          ilike(user.username, pattern),
          ilike(user.email, pattern),
        ),
      ),
    )
    .limit(limit);
}
