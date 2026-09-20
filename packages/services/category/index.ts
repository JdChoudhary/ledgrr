import { and, asc, count, db, eq, isNull } from "@repo/database";
import {
  budgets,
  categories,
  categoryGroups,
  merchants,
  recurringRules,
  transactionSplits,
  transactions,
  type SelectCategory,
} from "@repo/database/schema";
import { ServiceError, isUniqueViolation } from "../lib/errors";
import { parseInput } from "../lib/schema";
import { assertActiveSpaceMember } from "../space";
import {
  categoryLookupInputSchema,
  createCategoryInputSchema,
  listCategoriesInputSchema,
  mergeCategoriesInputSchema,
  updateCategoryInputSchema,
  type CategoryLookupInput,
  type CreateCategoryInput,
  type ListCategoriesInput,
  type MergeCategoriesInput,
  type UpdateCategoryInput,
} from "./model";

/**
 * Category service.
 *
 * Categories are soft-deleted (archived) and never hard-deleted, so historic
 * transactions keep a valid reference. Merging re-points every reference to
 * the surviving category inside one transaction.
 *
 * Only transactions are authoritative for money; category analytics live in
 * the rebuildable summary tables.
 */

const CATEGORY_NAME_CONSTRAINT = "categories_space_name_type_unique";
const CATEGORY_TEMPLATE_KEY_CONSTRAINT = "categories_space_template_key_unique";

const findCategory = async (
  spaceId: string,
  categoryId: string,
): Promise<SelectCategory | undefined> => {
  const [category] = await db
    .select()
    .from(categories)
    .where(and(eq(categories.id, categoryId), eq(categories.spaceId, spaceId)))
    .limit(1);

  return category;
};

const assertGroupInSpace = async (spaceId: string, groupId: string): Promise<void> => {
  const [group] = await db
    .select({ id: categoryGroups.id })
    .from(categoryGroups)
    .where(
      and(
        eq(categoryGroups.id, groupId),
        eq(categoryGroups.spaceId, spaceId),
        isNull(categoryGroups.archivedAt),
      ),
    )
    .limit(1);

  if (!group) {
    throw new ServiceError("NOT_FOUND", "Category group not found in this space");
  }
};

const translateCategoryWriteError = (error: unknown, name: string | undefined): never => {
  if (isUniqueViolation(error, CATEGORY_NAME_CONSTRAINT)) {
    throw new ServiceError("CONFLICT", `A category named "${name ?? ""}" already exists for this type`);
  }

  if (isUniqueViolation(error, CATEGORY_TEMPLATE_KEY_CONSTRAINT)) {
    throw new ServiceError("CONFLICT", "This template key is already used in this space");
  }

  throw error;
};

/** How many ledger rows already point at a category. */
const countCategoryUsage = async (spaceId: string, categoryId: string): Promise<number> => {
  const [transactionUsage] = await db
    .select({ value: count() })
    .from(transactions)
    .where(and(eq(transactions.spaceId, spaceId), eq(transactions.categoryId, categoryId)));

  const [splitUsage] = await db
    .select({ value: count() })
    .from(transactionSplits)
    .where(and(eq(transactionSplits.spaceId, spaceId), eq(transactionSplits.categoryId, categoryId)));

  return (transactionUsage?.value ?? 0) + (splitUsage?.value ?? 0);
};

/** Creates a category in a space the actor is an active member of. */
export async function createCategory(input: CreateCategoryInput): Promise<SelectCategory> {
  const { spaceId, actorUserId, name, type, groupId, templateKey, color, icon, sortOrder } =
    parseInput(createCategoryInputSchema, input, "createCategory input");

  await assertActiveSpaceMember({ spaceId, userId: actorUserId });

  if (groupId) {
    await assertGroupInSpace(spaceId, groupId);
  }

  try {
    const [category] = await db
      .insert(categories)
      .values({
        spaceId,
        createdBy: actorUserId,
        name,
        type,
        groupId,
        templateKey,
        color,
        icon,
        sortOrder,
      })
      .returning();

    if (!category) {
      throw new ServiceError("INVALID_STATE", "Failed to create category");
    }

    return category;
  } catch (error) {
    return translateCategoryWriteError(error, name);
  }
}

/** Renames / recolors / regroups a category. */
export async function updateCategory(input: UpdateCategoryInput): Promise<SelectCategory> {
  const { spaceId, actorUserId, categoryId, name, type, groupId, color, icon, sortOrder } =
    parseInput(updateCategoryInputSchema, input, "updateCategory input");

  await assertActiveSpaceMember({ spaceId, userId: actorUserId });

  const existing = await findCategory(spaceId, categoryId);

  if (!existing) {
    throw new ServiceError("NOT_FOUND", "Category not found in this space");
  }

  if (existing.archivedAt && type !== undefined && type !== existing.type) {
    throw new ServiceError("INVALID_STATE", "An archived category cannot change type");
  }

  if (type !== undefined && type !== existing.type) {
    const usage = await countCategoryUsage(spaceId, categoryId);

    if (usage > 0) {
      throw new ServiceError(
        "INVALID_STATE",
        "This category is already used by transactions; create a new category instead of changing its type",
        [`${usage} transaction or split row(s) reference this category`],
      );
    }
  }

  if (groupId) {
    await assertGroupInSpace(spaceId, groupId);
  }

  try {
    const [category] = await db
      .update(categories)
      .set({ name, type, groupId, color, icon, sortOrder })
      .where(and(eq(categories.id, categoryId), eq(categories.spaceId, spaceId)))
      .returning();

    if (!category) {
      throw new ServiceError("NOT_FOUND", "Category not found in this space");
    }

    return category;
  } catch (error) {
    return translateCategoryWriteError(error, name);
  }
}

/** Archives a category. History keeps resolving through the archived row. */
export async function archiveCategory(input: CategoryLookupInput): Promise<SelectCategory> {
  const { spaceId, actorUserId, categoryId } = parseInput(
    categoryLookupInputSchema,
    input,
    "archiveCategory input",
  );

  await assertActiveSpaceMember({ spaceId, userId: actorUserId });

  const [category] = await db
    .update(categories)
    .set({ archivedAt: new Date() })
    .where(
      and(
        eq(categories.id, categoryId),
        eq(categories.spaceId, spaceId),
        isNull(categories.archivedAt),
      ),
    )
    .returning();

  if (!category) {
    throw new ServiceError("NOT_FOUND", "Category not found or already archived");
  }

  return category;
}

/** Restores an archived category. */
export async function unarchiveCategory(input: CategoryLookupInput): Promise<SelectCategory> {
  const { spaceId, actorUserId, categoryId } = parseInput(
    categoryLookupInputSchema,
    input,
    "unarchiveCategory input",
  );

  await assertActiveSpaceMember({ spaceId, userId: actorUserId });

  const [category] = await db
    .update(categories)
    .set({ archivedAt: null })
    .where(and(eq(categories.id, categoryId), eq(categories.spaceId, spaceId)))
    .returning();

  if (!category) {
    throw new ServiceError("NOT_FOUND", "Category not found in this space");
  }

  return category;
}

/**
 * Canonical category hierarchy for selectors and displays.
 *
 * Shape is stable regardless of data: grouped categories nest under their
 * group, ungrouped categories appear flat at the top level. Names are
 * display-only; identifiers are stable IDs. Groups with no categories are
 * still returned (empty `categories` array) — nothing is fabricated, and no
 * fake "Ungrouped" group is ever created.
 */
export type CategoryHierarchy = {
  categoryGroups: Array<{
    id: string;
    name: string;
    categories: Array<{
      id: string;
      name: string;
    }>;
  }>;
  ungroupedCategories: Array<{
    id: string;
    name: string;
  }>;
};

/**
 * Builds the canonical `Category Groups → Categories` + `Ungrouped Categories`
 * response for a space. Only category data — no budgets, transactions, or
 * analytics. Archived rows are excluded unless `includeArchived` is set.
 */
export async function getCategoryHierarchy(input: ListCategoriesInput): Promise<CategoryHierarchy> {
  const { spaceId, actorUserId, type, includeArchived } = parseInput(
    listCategoriesInputSchema,
    input,
    "getCategoryHierarchy input",
  );

  await assertActiveSpaceMember({ spaceId, userId: actorUserId });

  const [groups, categoryRows] = await Promise.all([
    db
      .select({ id: categoryGroups.id, name: categoryGroups.name })
      .from(categoryGroups)
      .where(
        and(
          eq(categoryGroups.spaceId, spaceId),
          includeArchived ? undefined : isNull(categoryGroups.archivedAt),
        ),
      )
      .orderBy(asc(categoryGroups.sortOrder), asc(categoryGroups.name)),
    db
      .select({
        id: categories.id,
        name: categories.name,
        groupId: categories.groupId,
      })
      .from(categories)
      .where(
        and(
          eq(categories.spaceId, spaceId),
          includeArchived ? undefined : isNull(categories.archivedAt),
          type === undefined ? undefined : eq(categories.type, type),
        ),
      )
      .orderBy(asc(categories.sortOrder), asc(categories.name)),
  ]);

  return {
    categoryGroups: groups.map((group) => ({
      id: group.id,
      name: group.name,
      categories: categoryRows
        .filter((category) => category.groupId === group.id)
        .map((category) => ({ id: category.id, name: category.name })),
    })),
    ungroupedCategories: categoryRows
      .filter((category) => category.groupId === null)
      .map((category) => ({ id: category.id, name: category.name })),
  };
}

/** Returns one category, or `null` when it is not in the space. */
export async function getCategory(input: CategoryLookupInput): Promise<SelectCategory | null> {
  const { spaceId, actorUserId, categoryId } = parseInput(
    categoryLookupInputSchema,
    input,
    "getCategory input",
  );

  await assertActiveSpaceMember({ spaceId, userId: actorUserId });

  return (await findCategory(spaceId, categoryId)) ?? null;
}

/** Categories in a space, ordered for display. */
export async function listCategories(
  input: ListCategoriesInput,
): Promise<ReadonlyArray<SelectCategory>> {
  const { spaceId, actorUserId, type, groupId, includeArchived } = parseInput(
    listCategoriesInputSchema,
    input,
    "listCategories input",
  );

  await assertActiveSpaceMember({ spaceId, userId: actorUserId });

  return db
    .select()
    .from(categories)
    .where(
      and(
        eq(categories.spaceId, spaceId),
        includeArchived ? undefined : isNull(categories.archivedAt),
        type === undefined ? undefined : eq(categories.type, type),
        groupId === undefined ? undefined : eq(categories.groupId, groupId),
      ),
    )
    .orderBy(asc(categories.sortOrder), asc(categories.name));
}

/**
 * Merges `sourceCategoryId` into `targetCategoryId`.
 *
 * Both categories must live in the same space and share a type, otherwise
 * historic income could silently become expense. Every reference (transactions,
 * splits, merchant defaults, budgets, recurring rules) is re-pointed inside one
 * transaction, and the source category is archived with `merged_into_id` set.
 *
 * Analytics summaries are intentionally left alone: they are rebuildable, so a
 * rebuild job (metric_type = 'daily_category') regenerates them.
 */
export async function mergeCategories(input: MergeCategoriesInput): Promise<SelectCategory> {
  const { spaceId, actorUserId, sourceCategoryId, targetCategoryId } = parseInput(
    mergeCategoriesInputSchema,
    input,
    "mergeCategories input",
  );

  await assertActiveSpaceMember({ spaceId, userId: actorUserId });

  const [source, target] = await Promise.all([
    findCategory(spaceId, sourceCategoryId),
    findCategory(spaceId, targetCategoryId),
  ]);

  if (!source) {
    throw new ServiceError("NOT_FOUND", "Source category not found in this space");
  }

  if (!target) {
    throw new ServiceError("NOT_FOUND", "Target category not found in this space");
  }

  if (target.archivedAt) {
    throw new ServiceError("INVALID_STATE", "Cannot merge into an archived category");
  }

  if (source.type !== target.type) {
    throw new ServiceError(
      "INVALID_STATE",
      "Categories can only be merged with a category of the same type",
    );
  }

  await db.transaction(async (tx) => {
    await tx
      .update(transactions)
      .set({ categoryId: targetCategoryId, updatedBy: actorUserId })
      .where(and(eq(transactions.spaceId, spaceId), eq(transactions.categoryId, sourceCategoryId)));

    await tx
      .update(transactionSplits)
      .set({ categoryId: targetCategoryId })
      .where(
        and(
          eq(transactionSplits.spaceId, spaceId),
          eq(transactionSplits.categoryId, sourceCategoryId),
        ),
      );

    await tx
      .update(merchants)
      .set({ defaultCategoryId: targetCategoryId })
      .where(
        and(eq(merchants.spaceId, spaceId), eq(merchants.defaultCategoryId, sourceCategoryId)),
      );

    await tx
      .update(budgets)
      .set({ categoryId: targetCategoryId })
      .where(and(eq(budgets.spaceId, spaceId), eq(budgets.categoryId, sourceCategoryId)));

    await tx
      .update(recurringRules)
      .set({ categoryId: targetCategoryId })
      .where(and(eq(recurringRules.spaceId, spaceId), eq(recurringRules.categoryId, sourceCategoryId)));

    await tx
      .update(categories)
      .set({ mergedIntoId: targetCategoryId, archivedAt: new Date() })
      .where(and(eq(categories.id, sourceCategoryId), eq(categories.spaceId, spaceId)));
  });

  const merged = await findCategory(spaceId, sourceCategoryId);

  if (!merged) {
    throw new ServiceError("NOT_FOUND", "Source category not found in this space");
  }

  return merged;
}
