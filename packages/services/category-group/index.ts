import { and, asc, db, eq, isNull } from "@repo/database";
import { categoryGroups, type SelectCategoryGroup } from "@repo/database/schema";
import { ServiceError, isUniqueViolation } from "../lib/errors";
import { parseInput } from "../lib/schema";
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
 * Groups are scoped per user. Groups are archived, never deleted, so category
 * and transaction history keeps referring to something meaningful.
 */

const CATEGORY_GROUP_NAME_CONSTRAINT = "category_groups_user_name_unique";

const findCategoryGroup = async (
  actorUserId: string,
  categoryGroupId: string,
): Promise<SelectCategoryGroup | undefined> => {
  const [group] = await db
    .select()
    .from(categoryGroups)
    .where(and(eq(categoryGroups.id, categoryGroupId), eq(categoryGroups.userId, actorUserId)))
    .limit(1);

  return group;
};

/** Creates a user-scoped category group. */
export async function createCategoryGroup(
  input: CreateCategoryGroupInput,
): Promise<SelectCategoryGroup> {
  const { actorUserId, name, sortOrder } = parseInput(
    createCategoryGroupInputSchema,
    input,
    "createCategoryGroup input",
  );

  try {
    const [group] = await db
      .insert(categoryGroups)
      .values({ userId: actorUserId, createdBy: actorUserId, name, sortOrder })
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
  const { actorUserId, categoryGroupId, name, sortOrder } = parseInput(
    updateCategoryGroupInputSchema,
    input,
    "updateCategoryGroup input",
  );

  const existing = await findCategoryGroup(actorUserId, categoryGroupId);

  if (!existing) {
    throw new ServiceError("NOT_FOUND", "Category group not found for this user");
  }

  try {
    const [group] = await db
      .update(categoryGroups)
      .set({ name, sortOrder })
      .where(and(eq(categoryGroups.id, categoryGroupId), eq(categoryGroups.userId, actorUserId)))
      .returning();

    if (!group) {
      throw new ServiceError("NOT_FOUND", "Category group not found for this user");
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
  const { actorUserId, categoryGroupId } = parseInput(
    categoryGroupLookupInputSchema,
    input,
    "archiveCategoryGroup input",
  );

  const [group] = await db
    .update(categoryGroups)
    .set({ archivedAt: new Date() })
    .where(
      and(
        eq(categoryGroups.id, categoryGroupId),
        eq(categoryGroups.userId, actorUserId),
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
  const { actorUserId, categoryGroupId } = parseInput(
    categoryGroupLookupInputSchema,
    input,
    "unarchiveCategoryGroup input",
  );

  const [group] = await db
    .update(categoryGroups)
    .set({ archivedAt: null })
    .where(and(eq(categoryGroups.id, categoryGroupId), eq(categoryGroups.userId, actorUserId)))
    .returning();

  if (!group) {
    throw new ServiceError("NOT_FOUND", "Category group not found for this user");
  }

  return group;
}

/** Returns one group, or `null` when it is not owned by the user. */
export async function getCategoryGroup(
  input: CategoryGroupLookupInput,
): Promise<SelectCategoryGroup | null> {
  const { actorUserId, categoryGroupId } = parseInput(
    categoryGroupLookupInputSchema,
    input,
    "getCategoryGroup input",
  );

  return (await findCategoryGroup(actorUserId, categoryGroupId)) ?? null;
}

/** Groups owned by the user, ordered for display. */
export async function listCategoryGroups(
  input: ListCategoryGroupsInput,
): Promise<ReadonlyArray<SelectCategoryGroup>> {
  const { actorUserId, includeArchived } = parseInput(
    listCategoryGroupsInputSchema,
    input,
    "listCategoryGroups input",
  );

  return db
    .select()
    .from(categoryGroups)
    .where(
      and(
        eq(categoryGroups.userId, actorUserId),
        includeArchived ? undefined : isNull(categoryGroups.archivedAt),
      ),
    )
    .orderBy(asc(categoryGroups.sortOrder), asc(categoryGroups.name));
}
