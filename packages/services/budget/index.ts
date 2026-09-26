import { and, asc, db, eq, isNull, ne } from "@repo/database";
import {
  budgets,
  categoryGroups,
  categories,
  type SelectBudget,
  type SelectBudgetPeriod,
} from "@repo/database/schema";
import { ServiceError, isUniqueViolation } from "../lib/errors";
import { parseInput } from "../lib/schema";
import {
  createFirstBudgetPeriod,
  listBudgetOccurrences,
  getBudgetStatus,
  type BudgetStatus,
} from "./occurrences";
import {
  budgetLookupSchema,
  createBudgetInputSchema,
  listBudgetsSchema,
  updateBudgetInputSchema,
  type BudgetLookupInput,
  type CreateBudgetInput,
  type ListBudgetsInput,
  type UpdateBudgetInput,
} from "./model";

/**
 * Budget service.
 *
 * A budget targets exactly one category — the category is the budget's
 * identity (no custom names). The category group is never stored or accepted
 * here; it is always derived through budget → category → category_group.
 *
 * Duplicate protection: one active budget per (user, category) at a time.
 * Historical/archived budgets remain available per the lifecycle rules.
 */

// -------------------------------------------------------------------
// Internal helpers
// -------------------------------------------------------------------

const findBudget = async (
  actorUserId: string,
  budgetId: string,
): Promise<SelectBudget | undefined> => {
  const [budget] = await db
    .select()
    .from(budgets)
    .where(and(eq(budgets.id, budgetId), eq(budgets.userId, actorUserId)))
    .limit(1);
  return budget;
};

/**
 * A budget may reference any expense category owned by the user. Income
 * categories are not budget targets, and neither are merged categories.
 */
const assertBudgetableCategory = async (
  actorUserId: string,
  categoryId: string,
): Promise<void> => {
  const [category] = await db
    .select({ id: categories.id, type: categories.type, mergedIntoId: categories.mergedIntoId })
    .from(categories)
    .where(and(eq(categories.id, categoryId), eq(categories.userId, actorUserId)))
    .limit(1);

  if (!category) {
    throw new ServiceError("NOT_FOUND", "Category not found for this user");
  }
  if (category.type !== "expense") {
    throw new ServiceError("VALIDATION_ERROR", "Budgets can only target expense categories");
  }
  if (category.mergedIntoId) {
    throw new ServiceError("VALIDATION_ERROR", "Cannot budget a merged category");
  }
};

/**
 * Blocks a second active budget for the same (user, category). Archived
 * budgets are ignored; the budget being updated is excluded.
 */
const assertNoConflictingActiveBudget = async (
  actorUserId: string,
  categoryId: string,
  excludeBudgetId?: string,
): Promise<void> => {
  const [conflict] = await db
    .select({ id: budgets.id })
    .from(budgets)
    .where(
      and(
        eq(budgets.userId, actorUserId),
        eq(budgets.categoryId, categoryId),
        isNull(budgets.archivedAt),
        excludeBudgetId ? ne(budgets.id, excludeBudgetId) : undefined,
      ),
    )
    .limit(1);

  if (conflict) {
    throw new ServiceError(
      "CONFLICT",
      "This category already has an active budget for this user",
    );
  }
};

// -------------------------------------------------------------------
// Create
// -------------------------------------------------------------------

/**
 * Creates a budget for one category. `limit_amount > 0` enforced by zod + DB
 * CHECK; the first period occurrence is materialized in the same call.
 */
export async function createBudget(input: CreateBudgetInput): Promise<SelectBudget> {
  const {
    actorUserId,
    categoryId,
    periodType,
    startsOn,
    endsOn,
    limitAmount,
    rollover,
    alertThresholdPercent,
  } = parseInput(createBudgetInputSchema, input, "createBudget input");

  await assertBudgetableCategory(actorUserId, categoryId);
  await assertNoConflictingActiveBudget(actorUserId, categoryId);

  try {
    const [budget] = await db
      .insert(budgets)
      .values({
        userId: actorUserId,
        createdBy: actorUserId,
        categoryId,
        periodType,
        startsOn,
        endsOn: endsOn ?? null,
        limitAmount,
        rollover,
        alertThresholdPercent: alertThresholdPercent ?? null,
      })
      .returning();

    if (!budget) {
      throw new ServiceError("INVALID_STATE", "Failed to create budget");
    }

    // budgets is the rule; budget_periods are its occurrences. Create the
    // opening occurrence now so a new budget is immediately usable; later
    // occurrences materialize lazily when periods/status are read.
    await createFirstBudgetPeriod(budget);

    return budget;
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new ServiceError("CONFLICT", "A budget for this category already exists");
    }
    throw error;
  }
}

// -------------------------------------------------------------------
// Read
// -------------------------------------------------------------------

/** Returns a budget owned by the user. */
export async function getBudget(input: BudgetLookupInput): Promise<SelectBudget> {
  const { actorUserId, budgetId } = parseInput(
    budgetLookupSchema,
    input,
    "getBudget input",
  );


  const budget = await findBudget(actorUserId, budgetId);

  if (!budget) {
    throw new ServiceError("NOT_FOUND", "Budget not found for this user");
  }

  return budget;
}

/** Lists the user's budgets, optionally filtered by category. */
export async function listBudgets(
  input: ListBudgetsInput,
): Promise<ReadonlyArray<SelectBudget>> {
  const { actorUserId, categoryId, includeArchived } = parseInput(
    listBudgetsSchema,
    input,
    "listBudgets input",
  );


  return db
    .select()
    .from(budgets)
    .where(
      and(
        eq(budgets.userId, actorUserId),
        includeArchived ? undefined : isNull(budgets.archivedAt),
        categoryId === undefined ? undefined : eq(budgets.categoryId, categoryId),
      ),
    )
    .orderBy(asc(budgets.createdAt));
}

/**
 * Budgets grouped by category group → category, with each category carrying
 * at most one budget. Identifiers are stable IDs; names are display-only and
 * resolved fresh on every call so renames never break consumers.
 *
 * Shape: `{ groups: [{ id, name, categories: [{ id, name, budget }] }] }`.
 * Groups and categories without budgets are included so the UI can render
 * the full planning tree.
 */
export type GroupedCategoryBudget = {
  groups: Array<{
    id: string;
    name: string;
    categories: Array<{
      id: string;
      name: string;
      color: string;
      budget: SelectBudget | null;
    }>;
  }>;
  /** Expense categories without a category group. */
  ungrouped: Array<{
    id: string;
    name: string;
    color: string;
    budget: SelectBudget | null;
  }>;
};

export async function listGroupedBudgets(
  input: ListBudgetsInput,
): Promise<GroupedCategoryBudget> {
  const { actorUserId, includeArchived } = parseInput(
    listBudgetsSchema,
    input,
    "listGroupedBudgets input",
  );


  const [groups, categoryRows, budgetRows] = await Promise.all([
    db
      .select({ id: categoryGroups.id, name: categoryGroups.name })
      .from(categoryGroups)
      .where(
        and(
          eq(categoryGroups.userId, actorUserId),
          includeArchived ? undefined : isNull(categoryGroups.archivedAt),
        ),
      )
      .orderBy(asc(categoryGroups.sortOrder)),
    db
      .select({
        id: categories.id,
        name: categories.name,
        color: categories.color,
        groupId: categories.groupId,
      })
      .from(categories)
      .where(
        and(
          eq(categories.userId, actorUserId),
          eq(categories.type, "expense"),
          includeArchived ? undefined : isNull(categories.archivedAt),
        ),
      )
      .orderBy(asc(categories.sortOrder)),
    db
      .select()
      .from(budgets)
      .where(
        and(
          eq(budgets.userId, actorUserId),
          includeArchived ? undefined : isNull(budgets.archivedAt),
        ),
      ),
  ]);

  const budgetByCategory = new Map(
    budgetRows.map((budget) => [budget.categoryId, budget]),
  );

  return {
    groups: groups.map((group) => ({
      id: group.id,
      name: group.name,
      categories: categoryRows
        .filter((category) => category.groupId === group.id)
        .map((category) => ({
          id: category.id,
          name: category.name,
          color: category.color,
          budget: budgetByCategory.get(category.id) ?? null,
        })),
    })),
    // Categories without a group still appear — grouping is display-only.
    ungrouped: categoryRows
      .filter((category) => category.groupId === null)
      .map((category) => ({
        id: category.id,
        name: category.name,
        color: category.color,
        budget: budgetByCategory.get(category.id) ?? null,
      })),
  };
}

/** Returns periods for a budget, ordered by period start. */
export async function listBudgetPeriods(
  input: BudgetLookupInput,
): Promise<ReadonlyArray<SelectBudgetPeriod>> {
  const { actorUserId, budgetId } = parseInput(
    budgetLookupSchema,
    input,
    "listBudgetPeriods input",
  );


  const budget = await findBudget(actorUserId, budgetId);

  if (!budget) {
    throw new ServiceError("NOT_FOUND", "Budget not found for this user");
  }

  // Periods are materialized occurrences of the budget rule: reading them
  // creates missing rows and closes elapsed ones (rollover included).
  return listBudgetOccurrences(budget);
}

// -------------------------------------------------------------------
// Update
// -------------------------------------------------------------------

/**
 * Updates budget configuration: limit, rollover, alert threshold, end date,
 * and the target category. The category must be owned by the same user and be
 * budgetable. There is no budget name to set — the category is the identity.
 */
export async function updateBudget(input: UpdateBudgetInput): Promise<SelectBudget> {
  const {
    actorUserId,
    budgetId,
    categoryId,
    limitAmount,
    rollover,
    alertThresholdPercent,
    endsOn,
  } = parseInput(updateBudgetInputSchema, input, "updateBudget input");


  const budget = await findBudget(actorUserId, budgetId);

  if (!budget) {
    throw new ServiceError("NOT_FOUND", "Budget not found for this user");
  }

  if (budget.archivedAt) {
    throw new ServiceError("INVALID_STATE", "Cannot update an archived budget");
  }

  if (categoryId !== undefined && categoryId !== budget.categoryId) {
    await assertBudgetableCategory(actorUserId, categoryId);
    await assertNoConflictingActiveBudget(actorUserId, categoryId, budgetId);
  }

  const [updated] = await db
    .update(budgets)
    .set({
      categoryId,
      limitAmount,
      rollover,
      alertThresholdPercent,
      endsOn,
    })
    .where(and(eq(budgets.id, budgetId), eq(budgets.userId, actorUserId)))
    .returning();

  if (!updated) {
    throw new ServiceError("NOT_FOUND", "Budget not found for this user");
  }

  return updated;
}

// -------------------------------------------------------------------
// Archive / Unarchive
// -------------------------------------------------------------------

export async function archiveBudget(input: BudgetLookupInput): Promise<SelectBudget> {
  const { actorUserId, budgetId } = parseInput(
    budgetLookupSchema,
    input,
    "archiveBudget input",
  );


  const [budget] = await db
    .update(budgets)
    .set({ archivedAt: new Date() })
    .where(
      and(
        eq(budgets.id, budgetId),
        eq(budgets.userId, actorUserId),
        isNull(budgets.archivedAt),
      ),
    )
    .returning();

  if (!budget) {
    throw new ServiceError("NOT_FOUND", "Budget not found or already archived");
  }

  return budget;
}

export async function unarchiveBudget(input: BudgetLookupInput): Promise<SelectBudget> {
  const { actorUserId, budgetId } = parseInput(
    budgetLookupSchema,
    input,
    "unarchiveBudget input",
  );


  const budget = await findBudget(actorUserId, budgetId);

  if (!budget) {
    throw new ServiceError("NOT_FOUND", "Budget not found for this user");
  }

  // Re-activating must respect duplicate protection.
  await assertNoConflictingActiveBudget(actorUserId, budget.categoryId, budgetId);

  const [unarchived] = await db
    .update(budgets)
    .set({ archivedAt: null })
    .where(and(eq(budgets.id, budgetId), eq(budgets.userId, actorUserId)))
    .returning();

  if (!unarchived) {
    throw new ServiceError("NOT_FOUND", "Budget not found for this user");
  }

  return unarchived;
}

// -------------------------------------------------------------------
// Live status
// -------------------------------------------------------------------

/**
 * Live status for a budget: materializes missing occurrences, closes elapsed
 * ones (storing actual spend and rollover), then reports the current period,
 * live spend, remaining amount, percent used and state.
 *
 * `budgets` is the rule; `budget_periods` are its historical/current
 * occurrences. Live spend is computed from posted transactions — the only
 * financial source of truth — and never cached here.
 */
export async function budgetStatus(input: BudgetLookupInput): Promise<BudgetStatus> {
  return getBudgetStatus(input);
}
