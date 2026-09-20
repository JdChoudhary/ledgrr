import { and, db, eq, isNull } from "@repo/database";
import {
  spaceMembers,
  spaces,
  user,
  type SelectSpace,
  type SelectSpaceMember,
} from "@repo/database/schema";
// Reference-data checks belong to the currency service; re-exported here so
// existing consumers (account, goal, ...) keep their import path.
import { assertCurrencyExists } from "../currency";
import { ServiceError, isForeignKeyViolation, isUniqueViolation } from "../lib/errors";
import { parseInput } from "../lib/schema";
import {
  SHARED_SPACE_CAPABILITY_DEFAULTS,
  addSpaceMemberInputSchema,
  archiveSpaceInputSchema,
  assertSpaceRoleInputSchema,
  createPersonalSpaceInputSchema,
  createSharedSpaceInputSchema,
  getSpaceInputSchema,
  listSpacesInputSchema,
  removeSpaceMemberInputSchema,
  updateSpaceInputSchema,
  updateSpaceMemberRoleInputSchema,
  type AddSpaceMemberInput,
  type ArchiveSpaceInput,
  type AssertActiveSpaceMemberInput,
  type AssertSpaceRoleInput,
  type CreatePersonalSpaceInput,
  type CreateSharedSpaceInput,
  type GetSpaceInput,
  type ListSpacesInput,
  type RemoveSpaceMemberInput,
  type SpaceCapabilities,
  type SpaceMemberRole,
  type SpaceType,
  type UpdateSpaceInput,
  type UpdateSpaceMemberRoleInput,
} from "./model";

/**
 * Space service.
 *
 * Every exported function is standalone callable: it validates its own input,
 * resolves its own authorization, and returns plain data. Persistence-level
 * invariants (composite space FKs, CHECKs, partial uniques) stay in the
 * database so these functions can never drift out of enforcement.
 *
 * `space_members` (active membership = `removed_at IS NULL`) is the
 * authorization boundary. Friendship never grants financial access.
 */

const SPACE_MANAGER_ROLES: readonly SpaceMemberRole[] = ["owner", "admin"];

export type ActiveSpaceMembership = {
  id: string;
  spaceId: string;
  userId: string;
  role: SpaceMemberRole;
  defaultAccountId: string | null;
  joinedAt: Date | null;
  removedAt: Date | null;
  spaceType: SpaceType;
  spaceArchivedAt: Date | null;
};

const membershipColumns = {
  id: spaceMembers.id,
  spaceId: spaceMembers.spaceId,
  userId: spaceMembers.userId,
  role: spaceMembers.role,
  defaultAccountId: spaceMembers.defaultAccountId,
  joinedAt: spaceMembers.joinedAt,
  removedAt: spaceMembers.removedAt,
  spaceType: spaces.type,
  spaceArchivedAt: spaces.archivedAt,
};

export { assertCurrencyExists };

const getMembership = async (
  spaceId: string,
  userId: string,
): Promise<ActiveSpaceMembership | undefined> => {
  const [membership] = await db
    .select(membershipColumns)
    .from(spaceMembers)
    .innerJoin(spaces, eq(spaces.id, spaceMembers.spaceId))
    .where(
      and(
        eq(spaceMembers.spaceId, spaceId),
        eq(spaceMembers.userId, userId),
        isNull(spaceMembers.removedAt),
      ),
    )
    .limit(1);

  return membership;
};

// ---------------------------------------------------------------------------
// Authorization helpers (reused by the category / account services)
// ---------------------------------------------------------------------------

/** Throws unless `userId` is an active member of a non-archived space. */
export async function assertActiveSpaceMember(
  input: AssertActiveSpaceMemberInput,
): Promise<ActiveSpaceMembership> {
  const { spaceId, userId } = parseInput(
    getSpaceInputSchema,
    input,
    "assertActiveSpaceMember input",
  );

  const membership = await getMembership(spaceId, userId);

  if (!membership) {
    throw new ServiceError("FORBIDDEN", "You are not an active member of this space");
  }

  if (membership.spaceArchivedAt) {
    throw new ServiceError("INVALID_STATE", "This space is archived");
  }

  return membership;
}

/** Throws unless `userId` holds one of `roles` in a non-archived space. */
export async function assertSpaceRole(input: AssertSpaceRoleInput): Promise<ActiveSpaceMembership> {
  const { spaceId, userId, roles } = parseInput(
    assertSpaceRoleInputSchema,
    input,
    "assertSpaceRole input",
  );

  const membership = await assertActiveSpaceMember({ spaceId, userId });

  if (!roles.includes(membership.role)) {
    throw new ServiceError("FORBIDDEN", `This action requires one of: ${roles.join(", ")}`);
  }

  return membership;
}

// ---------------------------------------------------------------------------
// Create
// ---------------------------------------------------------------------------

/**
 * Creates the user's personal space and adds them as its only member.
 *
 * A user may own exactly one personal space: the check below is the friendly
 * path, and the `spaces_one_personal_per_owner` partial unique index is the
 * race-safe one.
 */
export async function createPersonalSpace(input: CreatePersonalSpaceInput): Promise<SelectSpace> {
  const { userId, currency, name } = parseInput(
    createPersonalSpaceInputSchema,
    input,
    "createPersonalSpace input",
  );

  const [existing] = await db
    .select({ spaceId: spaces.id })
    .from(spaces)
    .innerJoin(spaceMembers, eq(spaceMembers.spaceId, spaces.id))
    .where(
      and(
        eq(spaceMembers.userId, userId),
        isNull(spaceMembers.removedAt),
        eq(spaces.type, "personal"),
      ),
    )
    .limit(1);

  if (existing) {
    throw new ServiceError("CONFLICT", "You already have a personal space", [
      `Personal space ${existing.spaceId} already exists for this user`,
    ]);
  }

  await assertCurrencyExists(currency);

  try {
    return await db.transaction(async (tx) => {
      const [space] = await tx
        .insert(spaces)
        .values({
          ownerId: userId,
          type: "personal",
          name,
          baseCurrency: currency,
          // Personal finance is never shared.
          sharedLedger: false,
          sharedAccounts: false,
          billSplitting: true,
          budgeting: true,
          goalsEnabled: true,
        })
        .returning();

      if (!space) {
        throw new ServiceError("INVALID_STATE", "Failed to create personal space");
      }

      await tx.insert(spaceMembers).values({
        spaceId: space.id,
        userId,
        role: "owner",
        joinedAt: new Date(),
      });

      return space;
    });
  } catch (error) {
    if (isUniqueViolation(error, "spaces_one_personal_per_owner")) {
      throw new ServiceError("CONFLICT", "You already have a personal space");
    }

    if (isForeignKeyViolation(error)) {
      throw new ServiceError("VALIDATION_ERROR", "Unknown user or currency");
    }

    throw error;
  }
}

/**
 * Creates a shared space (household, couple, trip, ...) owned by `ownerId`.
 *
 * Capability flags default to the per-type values and can be narrowed by the
 * caller; the database CHECKs keep `sharedAccounts` from outrunning
 * `sharedLedger`.
 */
export async function createSharedSpace(input: CreateSharedSpaceInput): Promise<SelectSpace> {
  const { ownerId, type, name, description, currency, capabilities } = parseInput(
    createSharedSpaceInputSchema,
    input,
    "createSharedSpace input",
  );

  const defaults = SHARED_SPACE_CAPABILITY_DEFAULTS[type];

  const resolvedFlags: SpaceCapabilities = {
    sharedLedger: capabilities?.sharedLedger ?? defaults.sharedLedger,
    sharedAccounts: capabilities?.sharedAccounts ?? defaults.sharedAccounts,
    billSplitting: capabilities?.billSplitting ?? defaults.billSplitting,
    budgeting: capabilities?.budgeting ?? defaults.budgeting,
    goalsEnabled: capabilities?.goalsEnabled ?? defaults.goalsEnabled,
  };

  if (resolvedFlags.sharedAccounts && !resolvedFlags.sharedLedger) {
    throw new ServiceError("VALIDATION_ERROR", "sharedAccounts requires sharedLedger");
  }

  // Fall back to the owner's personal space currency.
  let baseCurrency = currency;

  if (!baseCurrency) {
    const [personalSpace] = await db
      .select({ baseCurrency: spaces.baseCurrency })
      .from(spaces)
      .innerJoin(spaceMembers, eq(spaceMembers.spaceId, spaces.id))
      .where(
        and(
          eq(spaceMembers.userId, ownerId),
          isNull(spaceMembers.removedAt),
          eq(spaces.type, "personal"),
        ),
      )
      .limit(1);

    baseCurrency = personalSpace?.baseCurrency;
  }

  if (!baseCurrency) {
    throw new ServiceError(
      "VALIDATION_ERROR",
      "currency is required when the owner has no personal space",
    );
  }

  await assertCurrencyExists(baseCurrency);

  try {
    return await db.transaction(async (tx) => {
      const [space] = await tx
        .insert(spaces)
        .values({
          ownerId,
          type,
          name,
          description,
          baseCurrency,
          ...resolvedFlags,
        })
        .returning();

      if (!space) {
        throw new ServiceError("INVALID_STATE", "Failed to create shared space");
      }

      await tx.insert(spaceMembers).values({
        spaceId: space.id,
        userId: ownerId,
        role: "owner",
        joinedAt: new Date(),
      });

      return space;
    });
  } catch (error) {
    if (isForeignKeyViolation(error)) {
      throw new ServiceError("VALIDATION_ERROR", "Unknown owner or currency");
    }

    throw error;
  }
}

// ---------------------------------------------------------------------------
// Read
// ---------------------------------------------------------------------------

/** Returns the space when the user is an active member (archived included). */
export async function getSpace(input: GetSpaceInput): Promise<SelectSpace | null> {
  const { spaceId, userId } = parseInput(getSpaceInputSchema, input, "getSpace input");

  const [row] = await db
    .select({ space: spaces })
    .from(spaces)
    .innerJoin(spaceMembers, eq(spaceMembers.spaceId, spaces.id))
    .where(
      and(eq(spaces.id, spaceId), eq(spaceMembers.userId, userId), isNull(spaceMembers.removedAt)),
    )
    .limit(1);

  return row?.space ?? null;
}

/** Every space the user is an active member of, with their role. */
export async function listSpacesForUser(
  input: ListSpacesInput,
): Promise<ReadonlyArray<{ space: SelectSpace; role: SpaceMemberRole; membershipId: string }>> {
  const { userId, includeArchived } = parseInput(
    listSpacesInputSchema,
    input,
    "listSpacesForUser input",
  );

  return db
    .select({ space: spaces, role: spaceMembers.role, membershipId: spaceMembers.id })
    .from(spaceMembers)
    .innerJoin(spaces, eq(spaces.id, spaceMembers.spaceId))
    .where(
      and(
        eq(spaceMembers.userId, userId),
        isNull(spaceMembers.removedAt),
        includeArchived ? undefined : isNull(spaces.archivedAt),
      ),
    );
}

/**
 * Active members of a space with their identity (name, email, image from the
 * user table). Visible to any active member.
 */
export type SpaceMemberListItem = SelectSpaceMember & {
  memberName: string | null;
  memberEmail: string | null;
  memberImage: string | null;
  memberUsername: string | null;
};

export async function listSpaceMembers(
  input: GetSpaceInput,
): Promise<ReadonlyArray<SpaceMemberListItem>> {
  const { spaceId, userId } = parseInput(getSpaceInputSchema, input, "listSpaceMembers input");

  await assertActiveSpaceMember({ spaceId, userId });

  const rows = await db
    .select({
      member: spaceMembers,
      memberName: user.name,
      memberEmail: user.email,
      memberImage: user.image,
      memberUsername: user.username,
    })
    .from(spaceMembers)
    .leftJoin(user, eq(spaceMembers.userId, user.id))
    .where(and(eq(spaceMembers.spaceId, spaceId), isNull(spaceMembers.removedAt)));

  return rows.map((r) => ({
    ...r.member,
    memberName: r.memberName,
    memberEmail: r.memberEmail,
    memberImage: r.memberImage,
    memberUsername: r.memberUsername,
  }));
}

// ---------------------------------------------------------------------------
// Update
// ---------------------------------------------------------------------------

/** Owner/admin metadata update. Ledger data is unaffected. */
export async function updateSpace(input: UpdateSpaceInput): Promise<SelectSpace> {
  const { spaceId, actorUserId, name, description, baseCurrency } = parseInput(
    updateSpaceInputSchema,
    input,
    "updateSpace input",
  );

  await assertSpaceRole({ spaceId, userId: actorUserId, roles: [...SPACE_MANAGER_ROLES] });

  if (baseCurrency) {
    await assertCurrencyExists(baseCurrency);
  }

  const [space] = await db
    .update(spaces)
    .set({ name, description, baseCurrency })
    .where(eq(spaces.id, spaceId))
    .returning();

  if (!space) {
    throw new ServiceError("NOT_FOUND", "Space not found");
  }

  return space;
}

/** Archives (never deletes) the space. Only the owner may do this. */
export async function archiveSpace(input: ArchiveSpaceInput): Promise<SelectSpace> {
  const { spaceId, actorUserId } = parseInput(
    archiveSpaceInputSchema,
    input,
    "archiveSpace input",
  );

  await assertSpaceRole({ spaceId, userId: actorUserId, roles: ["owner"] });

  const [space] = await db
    .update(spaces)
    .set({ archivedAt: new Date() })
    .where(and(eq(spaces.id, spaceId), isNull(spaces.archivedAt)))
    .returning();

  if (!space) {
    throw new ServiceError("INVALID_STATE", "Space not found or already archived");
  }

  return space;
}

/** Restores an archived space. Only the owner may do this. */
export async function unarchiveSpace(input: ArchiveSpaceInput): Promise<SelectSpace> {
  const { spaceId, actorUserId } = parseInput(
    archiveSpaceInputSchema,
    input,
    "unarchiveSpace input",
  );

  // The membership check below intentionally bypasses `assertActiveSpaceMember`,
  // which rejects archived spaces.
  const actor = await getMembership(spaceId, actorUserId);

  if (!actor || actor.role !== "owner") {
    throw new ServiceError("FORBIDDEN", "Only the space owner can restore a space");
  }

  const [space] = await db
    .update(spaces)
    .set({ archivedAt: null })
    .where(eq(spaces.id, spaceId))
    .returning();

  if (!space) {
    throw new ServiceError("NOT_FOUND", "Space not found");
  }

  return space;
}

// ---------------------------------------------------------------------------
// Membership
// ---------------------------------------------------------------------------

/**
 * Adds (or reactivates) a member. Shared spaces only: a personal space has
 * exactly one member by definition.
 */
export async function addSpaceMember(input: AddSpaceMemberInput): Promise<SelectSpaceMember> {
  const { spaceId, actorUserId, userId, role } = parseInput(
    addSpaceMemberInputSchema,
    input,
    "addSpaceMember input",
  );

  const actor = await assertSpaceRole({
    spaceId,
    userId: actorUserId,
    roles: [...SPACE_MANAGER_ROLES],
  });

  if (actor.spaceType === "personal") {
    throw new ServiceError("INVALID_STATE", "A personal space cannot have additional members");
  }

  const [member] = await db
    .insert(spaceMembers)
    .values({
      spaceId,
      userId,
      role,
      invitedBy: actorUserId,
      joinedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [spaceMembers.spaceId, spaceMembers.userId],
      set: { role, removedAt: null, joinedAt: new Date(), invitedBy: actorUserId },
    })
    .returning();

  if (!member) {
    throw new ServiceError("INVALID_STATE", "Failed to add space member");
  }

  return member;
}

/** Owner/admin role change. Ownership transfer is not supported. */
export async function updateSpaceMemberRole(
  input: UpdateSpaceMemberRoleInput,
): Promise<SelectSpaceMember> {
  const { spaceId, actorUserId, userId, role } = parseInput(
    updateSpaceMemberRoleInputSchema,
    input,
    "updateSpaceMemberRole input",
  );

  if (role === "owner") {
    throw new ServiceError("INVALID_STATE", "Ownership transfer is not supported");
  }

  await assertSpaceRole({ spaceId, userId: actorUserId, roles: [...SPACE_MANAGER_ROLES] });

  const [target] = await db
    .select({ role: spaceMembers.role })
    .from(spaceMembers)
    .where(
      and(
        eq(spaceMembers.spaceId, spaceId),
        eq(spaceMembers.userId, userId),
        isNull(spaceMembers.removedAt),
      ),
    )
    .limit(1);

  if (!target) {
    throw new ServiceError("NOT_FOUND", "Active space member not found");
  }

  if (target.role === "owner") {
    throw new ServiceError("INVALID_STATE", "The owner role cannot be changed");
  }

  const [member] = await db
    .update(spaceMembers)
    .set({ role })
    .where(
      and(
        eq(spaceMembers.spaceId, spaceId),
        eq(spaceMembers.userId, userId),
        isNull(spaceMembers.removedAt),
      ),
    )
    .returning();

  if (!member) {
    throw new ServiceError("INVALID_STATE", "Failed to update space member role");
  }

  return member;
}

/**
 * Removes a member by setting `removed_at` (history is preserved).
 *
 * A member may remove themselves; removing anyone else requires owner/admin.
 * The owner must always remain an active member, so the owner cannot leave.
 */
export async function removeSpaceMember(input: RemoveSpaceMemberInput): Promise<SelectSpaceMember> {
  const { spaceId, actorUserId, userId } = parseInput(
    removeSpaceMemberInputSchema,
    input,
    "removeSpaceMember input",
  );

  if (actorUserId === userId) {
    await assertActiveSpaceMember({ spaceId, userId: actorUserId });
  } else {
    await assertSpaceRole({ spaceId, userId: actorUserId, roles: [...SPACE_MANAGER_ROLES] });
  }

  const [target] = await db
    .select({ role: spaceMembers.role })
    .from(spaceMembers)
    .where(
      and(
        eq(spaceMembers.spaceId, spaceId),
        eq(spaceMembers.userId, userId),
        isNull(spaceMembers.removedAt),
      ),
    )
    .limit(1);

  if (!target) {
    throw new ServiceError("NOT_FOUND", "Active space member not found");
  }

  if (target.role === "owner") {
    throw new ServiceError("INVALID_STATE", "The owner cannot be removed from the space");
  }

  const [member] = await db
    .update(spaceMembers)
    .set({ removedAt: new Date() })
    .where(
      and(
        eq(spaceMembers.spaceId, spaceId),
        eq(spaceMembers.userId, userId),
        isNull(spaceMembers.removedAt),
      ),
    )
    .returning();

  if (!member) {
    throw new ServiceError("INVALID_STATE", "Failed to remove space member");
  }

  return member;
}
