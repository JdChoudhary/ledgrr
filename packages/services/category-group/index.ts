import { and, asc, db, eq, isNull } from "@repo/database";
import { categoryGroups, type SelectCategoryGroup } from "@repo/database/schema";
import { ServiceError, isUniqueViolation } from "../lib/errors";
import { parseInput } from "../lib/schema";
import { assertActiveSpaceMember } from "../space";
import {
  categoryGroupLookupInputSchema,
  createCategoryGroupInputSchema,
  listCategoryGroupsInputSchema,
  updateCategoryGroupInputSchema,
  type CategoryGroupLookupInput,
  type CreateCategoryGroupInput,
  type ListCategoryGroupsInput,
  type UpdateCategoryGroupInput,
} from "./model";

/**
 * Category group service.
 *
 * Any active space member may manage groups; membership (not friendship) is
 * the authorization boundary. Groups are archived, never deleted, so category
 * and transaction history keeps referring to something meaningful.
 */

const CATEGORY_GROUP_NAME_CONSTRAINT = "category_groups_space_name_unique";

const findCategoryGroup = async (
  spaceId: string,
  categoryGroupId: string,
): Promise<SelectCategoryGroup | undefined> => {
  const [group] = await db
    .select()
    .from(categoryGroups)
    .where(and(eq(categoryGroups.id, categoryGroupId), eq(categoryGroups.spaceId, spaceId)))
    .limit(1);

  return group;
};

/** Creates a group in a space the actor is an active member of. */
export async function createCategoryGroup(
  input: CreateCategoryGroupInput,
): Promise<SelectCategoryGroup> {
  const { spaceId, actorUserId, name, sortOrder } = parseInput(
    createCategoryGroupInputSchema,
    input,
    "createCategoryGroup input",
  );

  await assertActiveSpaceMember({ spaceId, userId: actorUserId });

  try {
    const [group] = await db
      .insert(categoryGroups)
      .values({ spaceId, createdBy: actorUserId, name, sortOrder })
      .returning();

    if (!group) {
      throw new ServiceError("INVALID_STATE", "Failed to create category group");
    }

    return group;
  } catch (error) {
    if (isUniqueViolation(error, CATEGORY_GROUP_NAME_CONSTRAINT)) {
      throw new ServiceError("CONFLICT", `A category group named "${name}" already exists`);
    }

    throw error;
  }
}

/** Renames / reorders a group. */
export async function updateCategoryGroup(
  input: UpdateCategoryGroupInput,
): Promise<SelectCategoryGroup> {
  const { spaceId, actorUserId, categoryGroupId, name, sortOrder } = parseInput(
    updateCategoryGroupInputSchema,
    input,
    "updateCategoryGroup input",
  );

  await assertActiveSpaceMember({ spaceId, userId: actorUserId });

  const existing = await findCategoryGroup(spaceId, categoryGroupId);

  if (!existing) {
    throw new ServiceError("NOT_FOUND", "Category group not found in this space");
  }

  try {
    const [group] = await db
      .update(categoryGroups)
      .set({ name, sortOrder })
      .where(and(eq(categoryGroups.id, categoryGroupId), eq(categoryGroups.spaceId, spaceId)))
      .returning();

    if (!group) {
      throw new ServiceError("NOT_FOUND", "Category group not found in this space");
    }

    return group;
  } catch (error) {
    if (isUniqueViolation(error, CATEGORY_GROUP_NAME_CONSTRAINT)) {
      throw new ServiceError("CONFLICT", `A category group named "${name}" already exists`);
    }

    throw error;
  }
}

/** Archives a group. Its categories stay valid and keep their `group_id`. */
export async function archiveCategoryGroup(
  input: CategoryGroupLookupInput,
): Promise<SelectCategoryGroup> {
  const { spaceId, actorUserId, categoryGroupId } = parseInput(
    categoryGroupLookupInputSchema,
    input,
    "archiveCategoryGroup input",
  );

  await assertActiveSpaceMember({ spaceId, userId: actorUserId });

  const [group] = await db
    .update(categoryGroups)
    .set({ archivedAt: new Date() })
    .where(
      and(
        eq(categoryGroups.id, categoryGroupId),
        eq(categoryGroups.spaceId, spaceId),
        isNull(categoryGroups.archivedAt),
      ),
    )
    .returning();

  if (!group) {
    throw new ServiceError("NOT_FOUND", "Category group not found or already archived");
  }

  return group;
}

/** Restores an archived group. */
export async function unarchiveCategoryGroup(
  input: CategoryGroupLookupInput,
): Promise<SelectCategoryGroup> {
  const { spaceId, actorUserId, categoryGroupId } = parseInput(
    categoryGroupLookupInputSchema,
    input,
    "unarchiveCategoryGroup input",
  );

  await assertActiveSpaceMember({ spaceId, userId: actorUserId });

  const [group] = await db
    .update(categoryGroups)
    .set({ archivedAt: null })
    .where(and(eq(categoryGroups.id, categoryGroupId), eq(categoryGroups.spaceId, spaceId)))
    .returning();

  if (!group) {
    throw new ServiceError("NOT_FOUND", "Category group not found in this space");
  }

  return group;
}

/** Returns one group, or `null` when it is not in the space. */
export async function getCategoryGroup(
  input: CategoryGroupLookupInput,
): Promise<SelectCategoryGroup | null> {
  const { spaceId, actorUserId, categoryGroupId } = parseInput(
    categoryGroupLookupInputSchema,
    input,
    "getCategoryGroup input",
  );

  await assertActiveSpaceMember({ spaceId, userId: actorUserId });

  return (await findCategoryGroup(spaceId, categoryGroupId)) ?? null;
}

/** Groups in a space, ordered for display. */
export async function listCategoryGroups(
  input: ListCategoryGroupsInput,
): Promise<ReadonlyArray<SelectCategoryGroup>> {
  const { spaceId, actorUserId, includeArchived } = parseInput(
    listCategoryGroupsInputSchema,
    input,
    "listCategoryGroups input",
  );

  await assertActiveSpaceMember({ spaceId, userId: actorUserId });

  return db
    .select()
    .from(categoryGroups)
    .where(
      and(
        eq(categoryGroups.spaceId, spaceId),
        includeArchived ? undefined : isNull(categoryGroups.archivedAt),
      ),
    )
    .orderBy(asc(categoryGroups.sortOrder), asc(categoryGroups.name));
}
