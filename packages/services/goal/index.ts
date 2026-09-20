import { and, db, eq, sql } from "@repo/database";
import {
  financialAccounts,
  goals,
  goalContributions,
  notifications,
  type SelectGoal,
  type SelectGoalContribution,
} from "@repo/database/schema";
import { ServiceError, isForeignKeyViolation } from "../lib/errors";
import { parseInput } from "../lib/schema";
import { assertActiveSpaceMember, assertCurrencyExists } from "../space";
import { recordEvent } from "../analytics";
import {
  contributeToGoalInputSchema,
  createGoalInputSchema,
  goalLookupSchema,
  listGoalContributionsInputSchema,
  listGoalsSchema,
  updateGoalInputSchema,
  type ContributionResult,
  type ContributeToGoalInput,
  type CreateGoalInput,
  type GoalLookupInput,
  type ListGoalsInput,
  type ListGoalContributionsInput,
  type UpdateGoalInput,
} from "./model";

const listGoalsColumns = {
  id: goals.id,
  spaceId: goals.spaceId,
  createdBy: goals.createdBy,
  linkedAccountId: goals.linkedAccountId,
  name: goals.name,
  targetAmount: goals.targetAmount,
  currentAmount: goals.currentAmount,
  currency: goals.currency,
  targetDate: goals.targetDate,
  completedAt: goals.completedAt,
  cancelledAt: goals.cancelledAt,
  createdAt: goals.createdAt,
  updatedAt: goals.updatedAt,
};

/**
 * Goal service.
 *
 * Goals track savings targets. State is derived:
 *   cancelled_at -> cancelled
 *   completed_at -> completed
 *   otherwise -> active
 *
 * `current_amount` is a rebuildable cache initialised to 0.
 * Linked accounts must belong to the same space.
 */

// -------------------------------------------------------------------
// Internal helpers
// -------------------------------------------------------------------

const findGoal = async (
  spaceId: string,
  goalId: string,
): Promise<SelectGoal | undefined> => {
  const [goal] = await db
    .select()
    .from(goals)
    .where(and(eq(goals.id, goalId), eq(goals.spaceId, spaceId)))
    .limit(1);
  return goal;
};

// -------------------------------------------------------------------
// Create
// -------------------------------------------------------------------

export async function createGoal(input: CreateGoalInput): Promise<SelectGoal> {
  const { spaceId, actorUserId, name, targetAmount, currency, targetDate, linkedAccountId } =
    parseInput(createGoalInputSchema, input, "createGoal input");

  await assertActiveSpaceMember({ spaceId, userId: actorUserId });

  const goalCurrency = currency ?? "USD";
  await assertCurrencyExists(goalCurrency);

  try {
    const [goal] = await db
      .insert(goals)
      .values({
        spaceId,
        createdBy: actorUserId,
        name,
        targetAmount,
        currency: goalCurrency,
        targetDate: targetDate ?? null,
        linkedAccountId: linkedAccountId ?? null,
      })
      .returning();

    if (!goal) {
      throw new ServiceError("INVALID_STATE", "Failed to create goal");
    }

    await recordEvent({
      actorUserId,
      spaceId: goal.spaceId,
      eventName: "goal_created",
      eventCategory: "goal",
      entityType: "goal",
      entityId: goal.id,
      properties: { name: goal.name, targetAmount: goal.targetAmount },
      idempotencyKey: `goal_created:${goal.id}`,
    });

    return goal;
  } catch (error) {
    if (isForeignKeyViolation(error)) {
      throw new ServiceError("VALIDATION_ERROR", "Invalid linked account or currency");
    }
    throw error;
  }
}

// -------------------------------------------------------------------
// Read
// -------------------------------------------------------------------

export async function getGoal(input: GoalLookupInput): Promise<SelectGoal> {
  const { spaceId, actorUserId, goalId } = parseInput(
    goalLookupSchema,
    input,
    "getGoal input",
  );

  await assertActiveSpaceMember({ spaceId, userId: actorUserId });

  const goal = await findGoal(spaceId, goalId);

  if (!goal) {
    throw new ServiceError("NOT_FOUND", "Goal not found in this space");
  }

  return goal;
}

export async function listGoals(
  input: ListGoalsInput,
): Promise<ReadonlyArray<SelectGoal>> {
  const { spaceId, actorUserId, includeArchived } = parseInput(
    listGoalsSchema,
    input,
    "listGoals input",
  );

  await assertActiveSpaceMember({ spaceId, userId: actorUserId });

  return db
    .select(listGoalsColumns)
    .from(goals)
    .where(eq(goals.spaceId, spaceId));
}

// -------------------------------------------------------------------
// Update
// -------------------------------------------------------------------

export async function updateGoal(input: UpdateGoalInput): Promise<SelectGoal> {
  const { spaceId, actorUserId, goalId, name, targetAmount, targetDate, linkedAccountId } =
    parseInput(updateGoalInputSchema, input, "updateGoal input");

  await assertActiveSpaceMember({ spaceId, userId: actorUserId });

  const goal = await findGoal(spaceId, goalId);

  if (!goal) {
    throw new ServiceError("NOT_FOUND", "Goal not found in this space");
  }

  if (goal.completedAt || goal.cancelledAt) {
    throw new ServiceError("INVALID_STATE", "Cannot update a completed or cancelled goal");
  }

  try {
    const [updated] = await db
      .update(goals)
      .set({ name, targetAmount, targetDate, linkedAccountId })
      .where(and(eq(goals.id, goalId), eq(goals.spaceId, spaceId)))
      .returning();

    if (!updated) {
      throw new ServiceError("NOT_FOUND", "Goal not found in this space");
    }

    return updated;
  } catch (error) {
    if (isForeignKeyViolation(error)) {
      throw new ServiceError("VALIDATION_ERROR", "Invalid linked account");
    }
    throw error;
  }
}

// -------------------------------------------------------------------
// Complete / Cancel
// -------------------------------------------------------------------

export async function completeGoal(input: GoalLookupInput): Promise<SelectGoal> {
  const { spaceId, actorUserId, goalId } = parseInput(
    goalLookupSchema,
    input,
    "completeGoal input",
  );

  await assertActiveSpaceMember({ spaceId, userId: actorUserId });

  const goal = await findGoal(spaceId, goalId);

  if (!goal) {
    throw new ServiceError("NOT_FOUND", "Goal not found in this space");
  }

  if (goal.completedAt) {
    throw new ServiceError("INVALID_STATE", "Goal is already completed");
  }

  if (goal.cancelledAt) {
    throw new ServiceError("INVALID_STATE", "Cannot complete a cancelled goal");
  }

  const [updated] = await db
    .update(goals)
    .set({ completedAt: new Date() })
    .where(and(eq(goals.id, goalId), eq(goals.spaceId, spaceId)))
    .returning();

  if (!updated) {
    throw new ServiceError("INVALID_STATE", "Failed to complete goal");
  }

  return updated;
}

export async function cancelGoal(input: GoalLookupInput): Promise<SelectGoal> {
  const { spaceId, actorUserId, goalId } = parseInput(
    goalLookupSchema,
    input,
    "cancelGoal input",
  );

  await assertActiveSpaceMember({ spaceId, userId: actorUserId });

  const goal = await findGoal(spaceId, goalId);

  if (!goal) {
    throw new ServiceError("NOT_FOUND", "Goal not found in this space");
  }

  if (goal.cancelledAt) {
    throw new ServiceError("INVALID_STATE", "Goal is already cancelled");
  }

  if (goal.completedAt) {
    throw new ServiceError("INVALID_STATE", "Cannot cancel a completed goal");
  }

  const [updated] = await db
    .update(goals)
    .set({ cancelledAt: new Date() })
    .where(and(eq(goals.id, goalId), eq(goals.spaceId, spaceId)))
    .returning();

  if (!updated) {
    throw new ServiceError("INVALID_STATE", "Failed to cancel goal");
  }

  return updated;
}

// -------------------------------------------------------------------
// Contributions — save with deposits and withdrawals
// -------------------------------------------------------------------

const toMoney = (value: string | number): number => Number(value);

const fmtMoney = (value: number): string => value.toFixed(4);

/**
 * Records a deposit or withdrawal (deposit or withdrawal) against a goal and
 * updates the rebuildable current_amount cache.
 *
 * Contributions are goal-domain records ONLY:
 * - No rows in the main transactions table.
 * - The linked account's balance is NOT modified (the money already sits
 *   in the account — the goal is just a label over it).
 *
 * Notification semantics (per product decision):
 * - On a withdrawal, if the LINKED ACCOUNT's balance (after the conceptual
 *   withdrawal) is below the goal's SAVED amount (currentAmount), raise a
 *   `goal_contribution` notification telling the user this withdrawal
 *   reduces their saved amount. This is about falling below what they
 *   already saved — never about the total goal target.
 * - A deposit that reaches the target raises a celebratory notification.
 */
export async function contributeToGoal(
  input: ContributeToGoalInput,
): Promise<ContributionResult> {
  const { spaceId, actorUserId, goalId, type, amount, accountId, note } =
    parseInput(contributeToGoalInputSchema, input, "contributeToGoal input");

  await assertActiveSpaceMember({ spaceId, userId: actorUserId });

  const goal = await findGoal(spaceId, goalId);

  if (!goal) {
    throw new ServiceError("NOT_FOUND", "Goal not found in this space");
  }

  if (goal.cancelledAt) {
    throw new ServiceError("INVALID_STATE", "Cannot contribute to a cancelled goal");
  }

  if (goal.completedAt) {
    throw new ServiceError("INVALID_STATE", "Goal is already completed");
  }

  const previousSaved = toMoney(goal.currentAmount);
  const delta = toMoney(amount);

  const newSaved = type === "deposit" ? previousSaved + delta : previousSaved - delta;

  if (newSaved < 0) {
    throw new ServiceError(
      "VALIDATION_ERROR",
      `Withdrawal exceeds saved amount (${fmtMoney(previousSaved)})`,
    );
  }

  const target = toMoney(goal.targetAmount);
  const targetReached = type === "deposit" && newSaved >= target && previousSaved < target;

  // The "drops below saved" check compares the linked account's balance
  // against the goal's saved amount. Only meaningful for withdrawals when
  // the goal actually has a linked account.
  const effectiveAccountId = accountId ?? goal.linkedAccountId;
  let accountBalanceAfter: number | null = null;
  let balanceBelowSaved = false;

  if (type === "withdrawal" && effectiveAccountId) {
    const [account] = await db
      .select({ balance: financialAccounts.balance })
      .from(financialAccounts)
      .where(
        and(
          eq(financialAccounts.id, effectiveAccountId),
          eq(financialAccounts.spaceId, spaceId),
        ),
      )
      .limit(1);

    if (!account) {
      throw new ServiceError("VALIDATION_ERROR", "Linked account not found in this space");
    }

    accountBalanceAfter = toMoney(account.balance) - delta;
    balanceBelowSaved = accountBalanceAfter < newSaved;
  }

  const belowSaved = type === "withdrawal" && balanceBelowSaved;
  const savedToZero = type === "withdrawal" && newSaved === 0 && previousSaved > 0;

  try {
    const result = await db.transaction(async (tx): Promise<ContributionResult> => {
      const [contribution] = await tx
        .insert(goalContributions)
        .values({
          goalId,
          spaceId,
          userId: actorUserId,
          accountId: accountId ?? null,
          type,
          amount: fmtMoney(delta),
          note: note ?? null,
        })
        .returning();

      if (!contribution) {
        throw new ServiceError("INVALID_STATE", "Failed to record contribution");
      }

      const [updatedGoal] = await tx
        .update(goals)
        .set({ currentAmount: fmtMoney(newSaved) })
        .where(and(eq(goals.id, goalId), eq(goals.spaceId, spaceId)))
        .returning();

      if (!updatedGoal) {
        throw new ServiceError("NOT_FOUND", "Goal not found in this space");
      }

      // --- notifications -------------------------------------------------
      const notificationRows: (typeof notifications.$inferInsert)[] = [];

      if (belowSaved) {
        notificationRows.push({
          userId: goal.createdBy,
          spaceId,
          type: "goal_contribution" as const,
          title: `Withdrawal reduces saved amount in “${goal.name}”`,
          body:
            accountBalanceAfter !== null
              ? `This withdrawal of ${fmtMoney(delta)} drops your linked account (${fmtMoney(accountBalanceAfter + delta)} → ${fmtMoney(accountBalanceAfter)}) below your saved amount of ${fmtMoney(newSaved)}. You're now eating into the money you set aside.`
              : `This withdrawal of ${fmtMoney(delta)} reduces your saved amount from ${fmtMoney(previousSaved)} to ${fmtMoney(newSaved)}.`,
          entityType: "goal",
          entityId: goalId,
          dedupeKey: `goal_below_saved:${contribution.id}`,
        });
      }

      if (targetReached) {
        notificationRows.push({
          userId: goal.createdBy,
          spaceId,
          type: "goal_contribution" as const,
          title: `🎉 Goal “${goal.name}” fully funded!`,
          body: `You reached your target of ${fmtMoney(target)}.`,
          entityType: "goal",
          entityId: goalId,
          dedupeKey: `goal_target_reached:${goalId}:${contribution.id}`,
        });
      }

      if (notificationRows.length > 0) {
        await tx.insert(notifications).values(notificationRows).onConflictDoNothing();
      }

      return {
        goalId,
        contributionId: contribution.id,
        type,
        amount: fmtMoney(delta),
        previousSavedAmount: fmtMoney(previousSaved),
        newSavedAmount: fmtMoney(newSaved),
        belowSaved,
        savedToZero,
        targetReached,
      };
    });

    await recordEvent({
      actorUserId,
      spaceId: goal.spaceId,
      eventName: type === "deposit" ? "goal_deposit" : "goal_withdrawal",
      eventCategory: "goal",
      entityType: "goal",
      entityId: goalId,
      properties: {
        amount: result.amount,
        contributionId: result.contributionId,
        targetReached: result.targetReached,
      },
      idempotencyKey: `goal_contribution:${result.contributionId}`,
    });

    return result;
  } catch (error) {
    if (isForeignKeyViolation(error)) {
      throw new ServiceError("VALIDATION_ERROR", "Invalid account for this goal's space");
    }
    throw error;
  }
}

/**
 * Contribution history for a goal, newest first.
 */
export async function listGoalContributions(
  input: ListGoalContributionsInput,
): Promise<ReadonlyArray<SelectGoalContribution>> {
  const { spaceId, actorUserId, goalId, limit } = parseInput(
    listGoalContributionsInputSchema,
    input,
    "listGoalContributions input",
  );

  await assertActiveSpaceMember({ spaceId, userId: actorUserId });

  const goal = await findGoal(spaceId, goalId);

  if (!goal) {
    throw new ServiceError("NOT_FOUND", "Goal not found in this space");
  }

  return db
    .select()
    .from(goalContributions)
    .where(and(eq(goalContributions.goalId, goalId), eq(goalContributions.spaceId, spaceId)))
    .orderBy(sql`${goalContributions.createdAt} DESC`)
    .limit(limit);
}


