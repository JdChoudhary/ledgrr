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

const CATEGORY_NAME_CONSTRAINT = "categories_user_name_type_unique";
const CATEGORY_TEMPLATE_KEY_CONSTRAINT = "categories_user_template_key_unique";

const findCategory = async (
  actorUserId: string,
  categoryId: string,
): Promise<SelectCategory | undefined> => {
  const [category] = await db
    .select()
    .from(categories)
    .where(and(eq(categories.id, categoryId), eq(categories.userId, actorUserId)))
    .limit(1);

  return category;
};

const assertGroupForUser = async (actorUserId: string, groupId: string): Promise<void> => {
  const [group] = await db
    .select({ id: categoryGroups.id })
    .from(categoryGroups)
    .where(
      and(
        eq(categoryGroups.id, groupId),
        eq(categoryGroups.userId, actorUserId),
        isNull(categoryGroups.archivedAt),
      ),
    )
    .limit(1);

  if (!group) {
    throw new ServiceError("NOT_FOUND", "Category group not found for this user");
  }
};

const translateCategoryWriteError = (error: unknown, name: string | undefined): never => {
  if (isUniqueViolation(error, CATEGORY_NAME_CONSTRAINT)) {
    throw new ServiceError("CONFLICT", `A category named "${name ?? ""}" already exists for this type`);
  }

  if (isUniqueViolation(error, CATEGORY_TEMPLATE_KEY_CONSTRAINT)) {
    throw new ServiceError("CONFLICT", "This template key is already used by this user");
  }

  throw error;
};

/** How many ledger rows already point at a category. */
const countCategoryUsage = async (actorUserId: string, categoryId: string): Promise<number> => {
  const [transactionUsage] = await db
    .select({ value: count() })
    .from(transactions)
    .where(and(eq(transactions.userId, actorUserId), eq(transactions.categoryId, categoryId)));

  const [splitUsage] = await db
    .select({ value: count() })
    .from(transactionSplits)
    .where(and(eq(transactionSplits.userId, actorUserId), eq(transactionSplits.categoryId, categoryId)));

  return (transactionUsage?.value ?? 0) + (splitUsage?.value ?? 0);
};

/** Creates a category owned by the user. */
export async function createCategory(input: CreateCategoryInput): Promise<SelectCategory> {
  const { actorUserId, name, type, groupId, templateKey, color, icon, sortOrder } =
    parseInput(createCategoryInputSchema, input, "createCategory input");

  if (groupId) {
    await assertGroupForUser(actorUserId, groupId);
  }

  try {
    const [category] = await db
      .insert(categories)
      .values({
        userId: actorUserId,
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
  const { actorUserId, categoryId, name, type, groupId, color, icon, sortOrder } =
    parseInput(updateCategoryInputSchema, input, "updateCategory input");

  const existing = await findCategory(actorUserId, categoryId);

  if (!existing) {
    throw new ServiceError("NOT_FOUND", "Category not found for this user");
  }

  if (existing.archivedAt && type !== undefined && type !== existing.type) {
    throw new ServiceError("INVALID_STATE", "An archived category cannot change type");
  }

  if (type !== undefined && type !== existing.type) {
    const usage = await countCategoryUsage(actorUserId, categoryId);

    if (usage > 0) {
      throw new ServiceError(
        "INVALID_STATE",
        "This category is already used by transactions; create a new category instead of changing its type",
        [`${usage} transaction or split row(s) reference this category`],
      );
    }
  }

  if (groupId) {
    await assertGroupForUser(actorUserId, groupId);
  }

  try {
    const [category] = await db
      .update(categories)
      .set({ name, type, groupId, color, icon, sortOrder })
      .where(and(eq(categories.id, categoryId), eq(categories.userId, actorUserId)))
      .returning();

    if (!category) {
      throw new ServiceError("NOT_FOUND", "Category not found for this user");
    }

    return category;
  } catch (error) {
    return translateCategoryWriteError(error, name);
  }
}

/** Archives a category. History keeps resolving through the archived row. */
export async function archiveCategory(input: CategoryLookupInput): Promise<SelectCategory> {
  const { actorUserId, categoryId } = parseInput(
    categoryLookupInputSchema,
    input,
    "archiveCategory input",
  );

  const [category] = await db
    .update(categories)
    .set({ archivedAt: new Date() })
    .where(
      and(
        eq(categories.id, categoryId),
        eq(categories.userId, actorUserId),
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
  const { actorUserId, categoryId } = parseInput(
    categoryLookupInputSchema,
    input,
    "unarchiveCategory input",
  );

  const [category] = await db
    .update(categories)
    .set({ archivedAt: null })
    .where(and(eq(categories.id, categoryId), eq(categories.userId, actorUserId)))
    .returning();

  if (!category) {
    throw new ServiceError("NOT_FOUND", "Category not found for this user");
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
 * response for a user. Only category data — no budgets, transactions, or
 * analytics. Archived rows are excluded unless `includeArchived` is set.
 */
export async function getCategoryHierarchy(input: ListCategoriesInput): Promise<CategoryHierarchy> {
  const { actorUserId, type, includeArchived } = parseInput(
    listCategoriesInputSchema,
    input,
    "getCategoryHierarchy input",
  );

  const [groups, categoryRows] = await Promise.all([
    db
      .select({ id: categoryGroups.id, name: categoryGroups.name })
      .from(categoryGroups)
      .where(
        and(
          eq(categoryGroups.userId, actorUserId),
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
          eq(categories.userId, actorUserId),
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

/** Returns one category, or `null` when it is not owned by the user. */
export async function getCategory(input: CategoryLookupInput): Promise<SelectCategory | null> {
  const { actorUserId, categoryId } = parseInput(
    categoryLookupInputSchema,
    input,
    "getCategory input",
  );

  return (await findCategory(actorUserId, categoryId)) ?? null;
}

/** Categories owned by the user, ordered for display. */
export async function listCategories(
  input: ListCategoriesInput,
): Promise<ReadonlyArray<SelectCategory>> {
  const { actorUserId, type, groupId, includeArchived } = parseInput(
    listCategoriesInputSchema,
    input,
    "listCategories input",
  );

  return db
    .select()
    .from(categories)
    .where(
      and(
        eq(categories.userId, actorUserId),
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
 * Both categories must be owned by the same user and share a type, otherwise
 * historic income could silently become expense. Every reference (transactions,
 * splits, merchant defaults, budgets, recurring rules) is re-pointed inside one
 * transaction, and the source category is archived with `merged_into_id` set.
 *
 * Analytics summaries are intentionally left alone: they are rebuildable, so a
 * rebuild job (metric_type = 'daily_category') regenerates them.
 */
export async function mergeCategories(input: MergeCategoriesInput): Promise<SelectCategory> {
  const { actorUserId, sourceCategoryId, targetCategoryId } = parseInput(
    mergeCategoriesInputSchema,
    input,
    "mergeCategories input",
  );

  const [source, target] = await Promise.all([
    findCategory(actorUserId, sourceCategoryId),
    findCategory(actorUserId, targetCategoryId),
  ]);

  if (!source) {
    throw new ServiceError("NOT_FOUND", "Source category not found for this user");
  }

  if (!target) {
    throw new ServiceError("NOT_FOUND", "Target category not found for this user");
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
      .where(and(eq(transactions.userId, actorUserId), eq(transactions.categoryId, sourceCategoryId)));

    await tx
      .update(transactionSplits)
      .set({ categoryId: targetCategoryId })
      .where(
        and(
          eq(transactionSplits.userId, actorUserId),
          eq(transactionSplits.categoryId, sourceCategoryId),
        ),
      );

    await tx
      .update(merchants)
      .set({ defaultCategoryId: targetCategoryId })
      .where(
        and(eq(merchants.userId, actorUserId), eq(merchants.defaultCategoryId, sourceCategoryId)),
      );

    await tx
      .update(budgets)
      .set({ categoryId: targetCategoryId })
      .where(and(eq(budgets.userId, actorUserId), eq(budgets.categoryId, sourceCategoryId)));

    await tx
      .update(recurringRules)
      .set({ categoryId: targetCategoryId })
      .where(and(eq(recurringRules.userId, actorUserId), eq(recurringRules.categoryId, sourceCategoryId)));

    await tx
      .update(categories)
      .set({ mergedIntoId: targetCategoryId, archivedAt: new Date() })
      .where(and(eq(categories.id, sourceCategoryId), eq(categories.userId, actorUserId)));
  });

  const merged = await findCategory(actorUserId, sourceCategoryId);

  if (!merged) {
    throw new ServiceError("NOT_FOUND", "Source category not found for this user");
  }

  return merged;
}
