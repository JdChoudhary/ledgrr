import { and, asc, db, eq, gte, inArray, isNull, lte, sql } from "@repo/database";
import {
  categories,
  householdBudgets,
  householdCategories,
  householdCategoryLinks,
  householdMembers,
  households,
  transactionSplits,
  transactions,
  user,
  type SelectHousehold,
  type SelectHouseholdBudget,
  type SelectHouseholdCategory,
  type SelectHouseholdCategoryLink,
  type SelectHouseholdMember,
} from "@repo/database/schema";
import { ServiceError, isUniqueViolation } from "../lib/errors";
import { parseInput } from "../lib/schema";
import { boundsFor, type PeriodBounds } from "../budget/periods";
import {
  createHouseholdBudgetInputSchema,
  createHouseholdCategoryInputSchema,
  createHouseholdInputSchema,
  householdCategoryLookupSchema,
  householdLookupSchema,
  householdMemberInputSchema,
  householdBudgetLookupSchema,
  linkHouseholdCategorySchema,
  listHouseholdBudgetsSchema,
  listHouseholdCategoriesSchema,
  listHouseholdsInputSchema,
  unlinkHouseholdCategorySchema,
  type CreateHouseholdBudgetInput,
  type CreateHouseholdCategoryInput,
  type CreateHouseholdInput,
  type HouseholdCategoryLookupInput,
  type HouseholdLookupInput,
  type HouseholdMemberInput,
  type HouseholdBudgetLookupInput,
  type LinkHouseholdCategoryInput,
  type ListHouseholdBudgetsInput,
  type ListHouseholdCategoriesInput,
  type ListHouseholdsInput,
  type UnlinkHouseholdCategoryInput,
} from "./model";

/**
 * Household / family sharing.
 *
 * Additive by design: nothing about personal ownership changes. A household has
 * members and shared categories; each member links their own category to a
 * shared one, and a shared budget on that category sums every linked member's
 * spending (personal-share aware, exactly like a personal budget).
 */

export type HouseholdRole = "owner" | "member";

export type HouseholdSummary = {
  household: SelectHousehold;
  role: HouseholdRole;
  memberCount: number;
};

export type HouseholdMemberWithProfile = {
  id: string;
  userId: string;
  role: HouseholdRole;
  joinedAt: Date;
  name: string;
  email: string;
  image: string | null;
};

export type HouseholdDetail = {
  household: SelectHousehold;
  role: HouseholdRole;
  members: HouseholdMemberWithProfile[];
};

export type HouseholdCategoryLinkDetail = {
  id: string;
  householdCategoryId: string;
  userId: string;
  categoryId: string;
  categoryName: string;
  categoryColor: string;
};

/** One member's contribution to a shared budget for the current period. */
export type HouseholdMemberSpend = {
  userId: string;
  name: string;
  email: string;
  image: string | null;
  /** Whether they have linked a personal category to this shared category. */
  linked: boolean;
  /** Personal-share aware spend, net of refunds, as a fixed-point string. */
  spend: string;
};

export type HouseholdBudgetStatus = {
  householdBudgetId: string;
  period: { periodStart: string; periodEnd: string; limitAmount: string } | null;
  liveSpend: string;
  remaining: string;
  percentUsed: number;
  state: "on_track" | "warning" | "over";
  /** Every household member's contribution, largest first. */
  members: HouseholdMemberSpend[];
};

const todayUtc = (): string => new Date().toISOString().slice(0, 10);
const money = (value: number): string => value.toFixed(4);

/** Inclusive bounds of the calendar month containing `date` (UTC). */
const calendarMonthBounds = (date: string): PeriodBounds => {
  const [year = 1970, month = 1] = date.split("-").map(Number);
  return {
    periodStart: `${date.slice(0, 7)}-01`,
    periodEnd: new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10),
  };
};

// ---------------------------------------------------------------------------
// Authorization
// ---------------------------------------------------------------------------

/** Throws unless the actor belongs to the household. Returns their membership. */
async function assertMembership(
  actorUserId: string,
  householdId: string,
): Promise<SelectHouseholdMember> {
  const [member] = await db
    .select()
    .from(householdMembers)
    .where(
      and(eq(householdMembers.householdId, householdId), eq(householdMembers.userId, actorUserId)),
    )
    .limit(1);

  if (!member) {
    throw new ServiceError("FORBIDDEN", "You are not a member of this household");
  }

  return member;
}

/** Throws unless the actor is the household owner. */
async function assertOwner(
  actorUserId: string,
  householdId: string,
): Promise<SelectHouseholdMember> {
  const member = await assertMembership(actorUserId, householdId);

  if (member.role !== "owner") {
    throw new ServiceError("FORBIDDEN", "Only the household owner can do this");
  }

  return member;
}

const findHouseholdCategory = async (
  householdCategoryId: string,
): Promise<SelectHouseholdCategory | undefined> => {
  const [row] = await db
    .select()
    .from(householdCategories)
    .where(eq(householdCategories.id, householdCategoryId))
    .limit(1);

  return row;
};

const findHouseholdBudget = async (
  householdBudgetId: string,
): Promise<SelectHouseholdBudget | undefined> => {
  const [row] = await db
    .select()
    .from(householdBudgets)
    .where(eq(householdBudgets.id, householdBudgetId))
    .limit(1);

  return row;
};

// ---------------------------------------------------------------------------
// Household + membership
// ---------------------------------------------------------------------------

/** Attaches the member's public profile for the UI. */
const withProfile = async (member: SelectHouseholdMember): Promise<HouseholdMemberWithProfile> => {
  const [profile] = await db
    .select({ name: user.name, email: user.email, image: user.image })
    .from(user)
    .where(eq(user.id, member.userId))
    .limit(1);

  return {
    id: member.id,
    userId: member.userId,
    role: member.role,
    joinedAt: member.joinedAt,
    name: profile?.name ?? "",
    email: profile?.email ?? "",
    image: profile?.image ?? null,
  };
};

/** Creates a household with the actor as its first, owning member. */
export async function createHousehold(input: CreateHouseholdInput): Promise<SelectHousehold> {
  const { actorUserId, name } = parseInput(
    createHouseholdInputSchema,
    input,
    "createHousehold input",
  );

  try {
    return await db.transaction(async (tx) => {
      const [household] = await tx
        .insert(households)
        .values({ name, createdBy: actorUserId })
        .returning();

      if (!household) {
        throw new ServiceError("INVALID_STATE", "Failed to create household");
      }

      await tx
        .insert(householdMembers)
        .values({ householdId: household.id, userId: actorUserId, role: "owner" });

      return household;
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new ServiceError("CONFLICT", "You already have a household with this name");
    }
    throw error;
  }
}

/** Households the actor belongs to, with their role and the member count. */
export async function listHouseholds(input: ListHouseholdsInput): Promise<HouseholdSummary[]> {
  const { actorUserId } = parseInput(listHouseholdsInputSchema, input, "listHouseholds input");

  const memberCount = sql<number>`(SELECT COUNT(*)::int FROM ${householdMembers} hm WHERE hm.household_id = ${households.id})`;

  const rows = await db
    .select({
      household: households,
      role: householdMembers.role,
      memberCount,
    })
    .from(householdMembers)
    .innerJoin(households, eq(households.id, householdMembers.householdId))
    .where(eq(householdMembers.userId, actorUserId))
    .orderBy(asc(households.createdAt));

  return rows.map((row) => ({
    household: row.household,
    role: row.role,
    memberCount: Number(row.memberCount),
  }));
}

/** Household detail with its members — member-only. */
export async function getHousehold(input: HouseholdLookupInput): Promise<HouseholdDetail> {
  const { actorUserId, householdId } = parseInput(
    householdLookupSchema,
    input,
    "getHousehold input",
  );

  const membership = await assertMembership(actorUserId, householdId);

  const [household] = await db
    .select()
    .from(households)
    .where(eq(households.id, householdId))
    .limit(1);

  if (!household) {
    throw new ServiceError("NOT_FOUND", "Household not found");
  }

  const members = await db
    .select({
      id: householdMembers.id,
      userId: householdMembers.userId,
      role: householdMembers.role,
      joinedAt: householdMembers.joinedAt,
      name: user.name,
      email: user.email,
      image: user.image,
    })
    .from(householdMembers)
    .innerJoin(user, eq(user.id, householdMembers.userId))
    .where(eq(householdMembers.householdId, householdId))
    .orderBy(asc(householdMembers.joinedAt));

  return { household, role: membership.role, members };
}

/** Adds a member. Owner only. Idempotency is deliberate: re-adding conflicts. */
export async function addHouseholdMember(
  input: HouseholdMemberInput,
): Promise<HouseholdMemberWithProfile> {
  const { actorUserId, householdId, userId } = parseInput(
    householdMemberInputSchema,
    input,
    "addHouseholdMember input",
  );

  await assertOwner(actorUserId, householdId);

  const [targetUser] = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);

  if (!targetUser) {
    throw new ServiceError("NOT_FOUND", "That user does not exist");
  }

  try {
    const [member] = await db
      .insert(householdMembers)
      .values({ householdId, userId, role: "member" })
      .returning();

    if (!member) {
      throw new ServiceError("INVALID_STATE", "Failed to add household member");
    }

    return withProfile(member);
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new ServiceError("CONFLICT", "That person is already in this household");
    }
    throw error;
  }
}

/** Removes a member. Owner only; the owner can never be removed. */
export async function removeHouseholdMember(
  input: HouseholdMemberInput,
): Promise<HouseholdMemberWithProfile> {
  const { actorUserId, householdId, userId } = parseInput(
    householdMemberInputSchema,
    input,
    "removeHouseholdMember input",
  );

  await assertOwner(actorUserId, householdId);

  const [member] = await db
    .select()
    .from(householdMembers)
    .where(and(eq(householdMembers.householdId, householdId), eq(householdMembers.userId, userId)))
    .limit(1);

  if (!member) {
    throw new ServiceError("NOT_FOUND", "That person is not in this household");
  }

  if (member.role === "owner") {
    throw new ServiceError("INVALID_STATE", "The household owner cannot be removed");
  }

  // Their category links go with them; shared definitions and budgets stay.
  await db.delete(householdCategoryLinks).where(eq(householdCategoryLinks.userId, userId));
  await db.delete(householdMembers).where(eq(householdMembers.id, member.id));

  return withProfile(member);
}

// ---------------------------------------------------------------------------
// Shared categories
// ---------------------------------------------------------------------------

/** Creates a shared category. Owner only. */
export async function createHouseholdCategory(
  input: CreateHouseholdCategoryInput,
): Promise<SelectHouseholdCategory> {
  const { actorUserId, householdId, name, type, color, icon, sortOrder } = parseInput(
    createHouseholdCategoryInputSchema,
    input,
    "createHouseholdCategory input",
  );

  await assertOwner(actorUserId, householdId);

  try {
    const [category] = await db
      .insert(householdCategories)
      .values({ householdId, createdBy: actorUserId, name, type, color, icon, sortOrder })
      .returning();

    if (!category) {
      throw new ServiceError("INVALID_STATE", "Failed to create shared category");
    }

    return category;
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new ServiceError("CONFLICT", "This household already has a category with that name");
    }
    throw error;
  }
}

/** Shared categories of a household — member-only. */
export async function listHouseholdCategories(
  input: ListHouseholdCategoriesInput,
): Promise<ReadonlyArray<SelectHouseholdCategory>> {
  const { actorUserId, householdId, includeArchived } = parseInput(
    listHouseholdCategoriesSchema,
    input,
    "listHouseholdCategories input",
  );

  await assertMembership(actorUserId, householdId);

  return db
    .select()
    .from(householdCategories)
    .where(
      and(
        eq(householdCategories.householdId, householdId),
        includeArchived ? undefined : isNull(householdCategories.archivedAt),
      ),
    )
    .orderBy(asc(householdCategories.sortOrder), asc(householdCategories.createdAt));
}

/** Archives a shared category. Owner only. */
export async function archiveHouseholdCategory(
  input: HouseholdCategoryLookupInput,
): Promise<SelectHouseholdCategory> {
  const { actorUserId, householdCategoryId } = parseInput(
    householdCategoryLookupSchema,
    input,
    "archiveHouseholdCategory input",
  );

  const category = await findHouseholdCategory(householdCategoryId);

  if (!category) {
    throw new ServiceError("NOT_FOUND", "Shared category not found");
  }

  await assertOwner(actorUserId, category.householdId);

  const [archived] = await db
    .update(householdCategories)
    .set({ archivedAt: new Date() })
    .where(
      and(eq(householdCategories.id, householdCategoryId), isNull(householdCategories.archivedAt)),
    )
    .returning();

  if (!archived) {
    throw new ServiceError("NOT_FOUND", "Shared category not found or already archived");
  }

  return archived;
}

/** Restores an archived shared category. Owner only. */
export async function unarchiveHouseholdCategory(
  input: HouseholdCategoryLookupInput,
): Promise<SelectHouseholdCategory> {
  const { actorUserId, householdCategoryId } = parseInput(
    householdCategoryLookupSchema,
    input,
    "unarchiveHouseholdCategory input",
  );

  const category = await findHouseholdCategory(householdCategoryId);

  if (!category) {
    throw new ServiceError("NOT_FOUND", "Shared category not found");
  }

  await assertOwner(actorUserId, category.householdId);

  const [restored] = await db
    .update(householdCategories)
    .set({ archivedAt: null })
    .where(eq(householdCategories.id, householdCategoryId))
    .returning();

  if (!restored) {
    throw new ServiceError("NOT_FOUND", "Shared category not found");
  }

  return restored;
}

// ---------------------------------------------------------------------------
// Category links
// ---------------------------------------------------------------------------

/** Links one of the actor's own categories to a shared category. */
export async function linkHouseholdCategory(
  input: LinkHouseholdCategoryInput,
): Promise<SelectHouseholdCategoryLink> {
  const { actorUserId, householdCategoryId, categoryId } = parseInput(
    linkHouseholdCategorySchema,
    input,
    "linkHouseholdCategory input",
  );

  const shared = await findHouseholdCategory(householdCategoryId);

  if (!shared) {
    throw new ServiceError("NOT_FOUND", "Shared category not found");
  }

  await assertMembership(actorUserId, shared.householdId);

  const [owned] = await db
    .select({ id: categories.id })
    .from(categories)
    .where(and(eq(categories.id, categoryId), eq(categories.userId, actorUserId)))
    .limit(1);

  if (!owned) {
    throw new ServiceError("NOT_FOUND", "Category not found for this user");
  }

  try {
    const [link] = await db
      .insert(householdCategoryLinks)
      .values({ householdCategoryId, userId: actorUserId, categoryId })
      .returning();

    if (!link) {
      throw new ServiceError("INVALID_STATE", "Failed to link category");
    }

    return link;
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new ServiceError("CONFLICT", "That category is already linked to a shared category");
    }
    throw error;
  }
}

/** Removes one of the actor's own links. */
export async function unlinkHouseholdCategory(
  input: UnlinkHouseholdCategoryInput,
): Promise<SelectHouseholdCategoryLink> {
  const { actorUserId, linkId } = parseInput(
    unlinkHouseholdCategorySchema,
    input,
    "unlinkHouseholdCategory input",
  );

  const [link] = await db
    .delete(householdCategoryLinks)
    .where(
      and(eq(householdCategoryLinks.id, linkId), eq(householdCategoryLinks.userId, actorUserId)),
    )
    .returning();

  if (!link) {
    throw new ServiceError("NOT_FOUND", "Link not found for this user");
  }

  return link;
}

/** Every member's links to this household's shared categories. */
export async function listHouseholdCategoryLinks(
  input: HouseholdLookupInput,
): Promise<HouseholdCategoryLinkDetail[]> {
  const { actorUserId, householdId } = parseInput(
    householdLookupSchema,
    input,
    "listHouseholdCategoryLinks input",
  );

  await assertMembership(actorUserId, householdId);

  const rows = await db
    .select({
      id: householdCategoryLinks.id,
      householdCategoryId: householdCategoryLinks.householdCategoryId,
      userId: householdCategoryLinks.userId,
      categoryId: householdCategoryLinks.categoryId,
      categoryName: categories.name,
      categoryColor: categories.color,
    })
    .from(householdCategoryLinks)
    .innerJoin(
      householdCategories,
      eq(householdCategories.id, householdCategoryLinks.householdCategoryId),
    )
    .innerJoin(categories, eq(categories.id, householdCategoryLinks.categoryId))
    .where(eq(householdCategories.householdId, householdId));

  return rows;
}

// ---------------------------------------------------------------------------
// Shared budgets
// ---------------------------------------------------------------------------

/** Creates a shared budget on a shared category. Owner only. */
export async function createHouseholdBudget(
  input: CreateHouseholdBudgetInput,
): Promise<SelectHouseholdBudget> {
  const {
    actorUserId,
    householdCategoryId,
    periodType,
    startsOn,
    endsOn,
    limitAmount,
    rollover,
    alertThresholdPercent,
  } = parseInput(createHouseholdBudgetInputSchema, input, "createHouseholdBudget input");

  const shared = await findHouseholdCategory(householdCategoryId);

  if (!shared) {
    throw new ServiceError("NOT_FOUND", "Shared category not found");
  }

  await assertOwner(actorUserId, shared.householdId);

  if (endsOn != null && endsOn < startsOn) {
    throw new ServiceError("VALIDATION_ERROR", "endsOn must be on or after startsOn");
  }

  const [budget] = await db
    .insert(householdBudgets)
    .values({
      householdId: shared.householdId,
      householdCategoryId,
      createdBy: actorUserId,
      periodType,
      startsOn,
      endsOn: endsOn ?? null,
      limitAmount,
      rollover,
      alertThresholdPercent: alertThresholdPercent ?? null,
    })
    .returning();

  if (!budget) {
    throw new ServiceError("INVALID_STATE", "Failed to create shared budget");
  }

  return budget;
}

/** Shared budgets of a household — member-only. */
export async function listHouseholdBudgets(
  input: ListHouseholdBudgetsInput,
): Promise<ReadonlyArray<SelectHouseholdBudget>> {
  const { actorUserId, householdId } = parseInput(
    listHouseholdBudgetsSchema,
    input,
    "listHouseholdBudgets input",
  );

  await assertMembership(actorUserId, householdId);

  return db
    .select()
    .from(householdBudgets)
    .where(and(eq(householdBudgets.householdId, householdId), isNull(householdBudgets.archivedAt)))
    .orderBy(asc(householdBudgets.createdAt));
}

/**
 * Spend for one or more shared categories, broken down per linked member:
 * each member's transactions on the personal categories they mapped to it.
 * The allocation mirrors personal budgets — category splits contribute their
 * per-category line, and a bill split contributes only the member's own share.
 */
const computeHouseholdCategorySpendByMember = async (
  householdCategoryIds: string[],
  periodStart: string,
  periodEnd: string,
): Promise<
  { householdCategoryId: string; userId: string; expense: number; refund: number; income: number }[]
> => {
  if (householdCategoryIds.length === 0) {
    return [];
  }

  const hasAnySplits = sql`EXISTS (
    SELECT 1 FROM ${transactionSplits} s
    WHERE s.transaction_id = ${transactions.id}
      AND s.user_id = ${transactions.userId}
  )`;
  const splitShare = sql`COALESCE((
    SELECT SUM(s.amount * (${transactions.amountInBaseCurrency} / NULLIF(${transactions.amount}, 0)))
    FROM ${transactionSplits} s
    WHERE s.transaction_id = ${transactions.id}
      AND s.user_id = ${transactions.userId}
      AND s.category_id = ${householdCategoryLinks.categoryId}
  ), 0)`;
  const personalShareRatio = sql`(${transactions.personalAmount} / NULLIF(${transactions.amount}, 0))`;
  const alloc = sql`(CASE WHEN ${hasAnySplits} THEN ${splitShare}
    ELSE CASE WHEN ${transactions.categoryId} = ${householdCategoryLinks.categoryId}
      THEN ${transactions.amountInBaseCurrency} ELSE 0 END END) * ${personalShareRatio}`;

  const rows = await db
    .select({
      householdCategoryId: householdCategoryLinks.householdCategoryId,
      userId: householdCategoryLinks.userId,
      expense: sql<string>`COALESCE(SUM(CASE WHEN ${transactions.type} = 'expense' THEN ${alloc} ELSE 0 END), 0)`,
      refund: sql<string>`COALESCE(SUM(CASE WHEN ${transactions.type} = 'refund' THEN ${alloc} ELSE 0 END), 0)`,
      income: sql<string>`COALESCE(SUM(CASE WHEN ${transactions.type} = 'income' THEN ${alloc} ELSE 0 END), 0)`,
    })
    .from(householdCategoryLinks)
    .innerJoin(
      transactions,
      and(
        eq(transactions.userId, householdCategoryLinks.userId),
        eq(transactions.status, "posted"),
        isNull(transactions.deletedAt),
        gte(transactions.date, periodStart),
        lte(transactions.date, periodEnd),
        inArray(transactions.type, ["expense", "refund", "income"]),
      ),
    )
    .where(inArray(householdCategoryLinks.householdCategoryId, householdCategoryIds))
    .groupBy(householdCategoryLinks.householdCategoryId, householdCategoryLinks.userId);

  return rows.map((row) => ({
    householdCategoryId: row.householdCategoryId,
    userId: row.userId,
    expense: Number(row.expense ?? 0),
    refund: Number(row.refund ?? 0),
    income: Number(row.income ?? 0),
  }));
};

/** Total spend for a shared category — the sum of every member's contribution. */
const computeHouseholdCategorySpend = async (
  householdCategoryId: string,
  periodStart: string,
  periodEnd: string,
): Promise<number> => {
  const rows = await computeHouseholdCategorySpendByMember(
    [householdCategoryId],
    periodStart,
    periodEnd,
  );

  return Math.max(
    0,
    rows.reduce((total, row) => total + row.expense - row.refund, 0),
  );
};

/**
 * Per-person expense for every shared category of a household.
 *
 * The window is each category's own active budget period when it has one,
 * otherwise the current calendar month.
 */
export type HouseholdCategorySpend = {
  householdCategoryId: string;
  periodStart: string;
  periodEnd: string;
  /** Sum of every member's contribution for the window. */
  total: string;
  /** Every household member, largest first (zeros included). */
  members: HouseholdMemberSpend[];
};

/** Every member's contribution to a shared category for the given period. */
const householdMemberSpend = async (
  householdId: string,
  householdCategoryId: string,
  period: { periodStart: string; periodEnd: string } | null,
): Promise<HouseholdMemberSpend[]> => {
  const [byMember, links, members] = await Promise.all([
    period
      ? computeHouseholdCategorySpendByMember(
          [householdCategoryId],
          period.periodStart,
          period.periodEnd,
        )
      : Promise.resolve([]),
    db
      .select({ userId: householdCategoryLinks.userId })
      .from(householdCategoryLinks)
      .where(eq(householdCategoryLinks.householdCategoryId, householdCategoryId)),
    db
      .select({
        userId: householdMembers.userId,
        name: user.name,
        email: user.email,
        image: user.image,
      })
      .from(householdMembers)
      .innerJoin(user, eq(user.id, householdMembers.userId))
      .where(eq(householdMembers.householdId, householdId))
      .orderBy(asc(householdMembers.joinedAt)),
  ]);

  const spendByMember = new Map(
    byMember.map((row) => [row.userId, Math.max(0, row.expense - row.refund)]),
  );
  const linkedByMember = new Set(links.map((row) => row.userId));

  return members
    .map((member) => ({
      userId: member.userId,
      name: member.name,
      email: member.email,
      image: member.image,
      linked: linkedByMember.has(member.userId),
      spend: money(spendByMember.get(member.userId) ?? 0),
    }))
    .sort((a, b) => Number(b.spend) - Number(a.spend));
};

/** Live status for a shared budget: the current period and everyone's spend. */
export async function householdBudgetStatus(
  input: HouseholdBudgetLookupInput,
): Promise<HouseholdBudgetStatus> {
  const { actorUserId, householdBudgetId } = parseInput(
    householdBudgetLookupSchema,
    input,
    "householdBudgetStatus input",
  );

  const budget = await findHouseholdBudget(householdBudgetId);

  if (!budget) {
    throw new ServiceError("NOT_FOUND", "Shared budget not found");
  }

  await assertMembership(actorUserId, budget.householdId);

  const current = boundsFor(
    { periodType: budget.periodType, startsOn: budget.startsOn, endsOn: budget.endsOn },
    todayUtc(),
  );

  if (!current) {
    const members = await householdMemberSpend(
      budget.householdId,
      budget.householdCategoryId,
      null,
    );

    return {
      householdBudgetId: budget.id,
      period: null,
      liveSpend: money(0),
      remaining: money(Number(budget.limitAmount)),
      percentUsed: 0,
      state: "on_track",
      members,
    };
  }

  const [liveSpend, members] = await Promise.all([
    computeHouseholdCategorySpend(
      budget.householdCategoryId,
      current.periodStart,
      current.periodEnd,
    ),
    householdMemberSpend(budget.householdId, budget.householdCategoryId, current),
  ]);

  const limit = Number(budget.limitAmount);
  const remaining = limit - liveSpend;
  const percentUsed = limit > 0 ? Math.round((liveSpend / limit) * 100) : 0;

  const state: HouseholdBudgetStatus["state"] =
    percentUsed >= 100
      ? "over"
      : budget.alertThresholdPercent !== null && percentUsed >= budget.alertThresholdPercent
        ? "warning"
        : "on_track";

  return {
    householdBudgetId: budget.id,
    period: {
      periodStart: current.periodStart,
      periodEnd: current.periodEnd,
      limitAmount: budget.limitAmount,
    },
    liveSpend: money(liveSpend),
    remaining: money(remaining),
    percentUsed,
    state,
    members,
  };
}

/**
 * Per-person expense for every active shared category of a household.
 *
 * Each category's window is its own active budget's current occurrence when
 * one exists, otherwise the current calendar month. Categories sharing a
 * window are aggregated in a single query.
 */
export async function listHouseholdCategorySpend(
  input: HouseholdLookupInput,
): Promise<HouseholdCategorySpend[]> {
  const { actorUserId, householdId } = parseInput(
    householdLookupSchema,
    input,
    "listHouseholdCategorySpend input",
  );

  await assertMembership(actorUserId, householdId);

  const today = todayUtc();
  const month = calendarMonthBounds(today);

  const [categories, budgets, links, members] = await Promise.all([
    db
      .select()
      .from(householdCategories)
      .where(
        and(
          eq(householdCategories.householdId, householdId),
          isNull(householdCategories.archivedAt),
        ),
      )
      .orderBy(asc(householdCategories.sortOrder), asc(householdCategories.createdAt)),
    db
      .select()
      .from(householdBudgets)
      .where(
        and(eq(householdBudgets.householdId, householdId), isNull(householdBudgets.archivedAt)),
      ),
    db
      .select({
        householdCategoryId: householdCategoryLinks.householdCategoryId,
        userId: householdCategoryLinks.userId,
      })
      .from(householdCategoryLinks)
      .innerJoin(
        householdCategories,
        eq(householdCategories.id, householdCategoryLinks.householdCategoryId),
      )
      .where(eq(householdCategories.householdId, householdId)),
    db
      .select({
        userId: householdMembers.userId,
        name: user.name,
        email: user.email,
        image: user.image,
      })
      .from(householdMembers)
      .innerJoin(user, eq(user.id, householdMembers.userId))
      .where(eq(householdMembers.householdId, householdId))
      .orderBy(asc(householdMembers.joinedAt)),
  ]);

  if (categories.length === 0) {
    return [];
  }

  const budgetsByCategory = new Map(budgets.map((budget) => [budget.householdCategoryId, budget]));

  // Resolve each category's window, then group categories that share one so
  // the whole page costs one spend query per distinct period, not per row.
  const windows = categories.map((category) => {
    const budget = budgetsByCategory.get(category.id);
    const current = budget
      ? boundsFor(
          { periodType: budget.periodType, startsOn: budget.startsOn, endsOn: budget.endsOn },
          today,
        )
      : null;

    return { category, period: current ?? month };
  });

  const idsByPeriod = new Map<string, { period: PeriodBounds; ids: string[] }>();
  for (const { category, period } of windows) {
    const key = `${period.periodStart}|${period.periodEnd}`;
    const group = idsByPeriod.get(key);
    if (group) {
      group.ids.push(category.id);
    } else {
      idsByPeriod.set(key, { period, ids: [category.id] });
    }
  }

  const batches = await Promise.all(
    [...idsByPeriod.values()].map((group) =>
      computeHouseholdCategorySpendByMember(
        group.ids,
        group.period.periodStart,
        group.period.periodEnd,
      ),
    ),
  );

  const spendByCategory = new Map<
    string,
    Map<string, { expense: number; refund: number; income: number }>
  >();
  for (const row of batches.flat()) {
    const perMember = spendByCategory.get(row.householdCategoryId) ?? new Map();
    perMember.set(row.userId, row);
    spendByCategory.set(row.householdCategoryId, perMember);
  }

  const linkedByCategory = new Map<string, Set<string>>();
  for (const link of links) {
    const linked = linkedByCategory.get(link.householdCategoryId) ?? new Set<string>();
    linked.add(link.userId);
    linkedByCategory.set(link.householdCategoryId, linked);
  }

  return windows.map(({ category, period }) => {
    const perMember = spendByCategory.get(category.id);
    const linked = linkedByCategory.get(category.id) ?? new Set<string>();

    const membersWithSpend = members
      .map((member) => {
        const row = perMember?.get(member.userId);
        const value =
          category.type === "income"
            ? (row?.income ?? 0)
            : Math.max(0, (row?.expense ?? 0) - (row?.refund ?? 0));

        return {
          userId: member.userId,
          name: member.name,
          email: member.email,
          image: member.image,
          linked: linked.has(member.userId),
          spend: money(value),
        };
      })
      .sort((a, b) => Number(b.spend) - Number(a.spend));

    return {
      householdCategoryId: category.id,
      periodStart: period.periodStart,
      periodEnd: period.periodEnd,
      total: money(membersWithSpend.reduce((total, member) => total + Number(member.spend), 0)),
      members: membersWithSpend,
    };
  });
}
