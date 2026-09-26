import { and, asc, db, eq, isNull } from "@repo/database";
import {
  accountGrants,
  financialAccounts,
  userSettings,
  type SelectAccountGrant,
  type SelectFinancialAccount,
} from "@repo/database/schema";
import { ServiceError, isForeignKeyViolation } from "../lib/errors";
import { parseInput } from "../lib/schema";
import { assertCurrencyExists } from "../currency";
import {
  accountLookupInputSchema,
  createAccountInputSchema,
  grantAccountAccessInputSchema,
  listAccountsInputSchema,
  revokeAccountAccessInputSchema,
  updateAccountInputSchema,
  isCreditAccountType,
  type AccountAccess,
  type AccountLookupInput,
  type CreateAccountInput,
  type GrantAccountAccessInput,
  type ListAccountsInput,
  type RevokeAccountAccessInput,
  type UpdateAccountInput,
} from "./model";

/**
 * Financial account service.
 *
 * Accounts belong to exactly one user. Restricted accounts can be shared
 * with other users through `account_grants`.
 *
 * `balance` is a rebuildable cache
 * (`opening_balance` + posted, non-deleted transactions), so it is only
 * *initialised* here — never recomputed, never mutated by corrections.
 */

export type EffectiveAccountAccess = "none" | "view" | "contribute" | "manage";

const ACCESS_RANK: Record<EffectiveAccountAccess, number> = {
  none: 0,
  view: 1,
  contribute: 2,
  manage: 3,
};

const findAccountById = async (
  accountId: string,
): Promise<SelectFinancialAccount | undefined> => {
  const [account] = await db
    .select()
    .from(financialAccounts)
    .where(eq(financialAccounts.id, accountId))
    .limit(1);

  return account;
};

const findOwnedAccount = async (
  userId: string,
  accountId: string,
): Promise<SelectFinancialAccount | undefined> => {
  const [account] = await db
    .select()
    .from(financialAccounts)
    .where(and(eq(financialAccounts.id, accountId), eq(financialAccounts.userId, userId)))
    .limit(1);

  return account;
};

const findGrantAccess = async (
  accountId: string,
  userId: string,
): Promise<AccountAccess | undefined> => {
  const [grant] = await db
    .select({ access: accountGrants.access })
    .from(accountGrants)
    .where(and(eq(accountGrants.accountId, accountId), eq(accountGrants.userId, userId)))
    .limit(1);

  return grant?.access;
};

/**
 * Effective access for a user: the owner always has manage access;
 * `restricted` accounts additionally require a grant.
 */
export async function resolveAccountAccess(
  account: SelectFinancialAccount,
  userId: string,
): Promise<EffectiveAccountAccess> {
  if (account.userId === userId) {
    return "manage";
  }

  if (account.visibility !== "restricted") {
    return "none";
  }

  return (await findGrantAccess(account.id, userId)) ?? "none";
}

/**
 * Throws unless the actor has at least `required` access to the account.
 * Reused by the transaction service before money moves.
 */
export async function assertAccountAccess(input: {
  actorUserId: string;
  accountId: string;
  required?: EffectiveAccountAccess;
}): Promise<{ account: SelectFinancialAccount; access: EffectiveAccountAccess }> {
  const { actorUserId, accountId, required = "view" } = input;

  const account = await findAccountById(accountId);

  if (!account) {
    throw new ServiceError("NOT_FOUND", "Account not found");
  }

  const access = await resolveAccountAccess(account, actorUserId);

  if (ACCESS_RANK[access] < ACCESS_RANK[required]) {
    throw new ServiceError(
      "FORBIDDEN",
      required === "view"
        ? "You do not have access to this account"
        : `This action requires ${required} access to the account`,
    );
  }

  return { account, access };
}

// ---------------------------------------------------------------------------
// Create
// ---------------------------------------------------------------------------

/**
 * Creates an account for the user.
 *
 * `balance` starts at `opening_balance`; every later change comes from posted
 * transactions.
 */
export async function createAccount(input: CreateAccountInput): Promise<SelectFinancialAccount> {
  const {
    actorUserId,
    name,
    type,
    currency,
    visibility,
    openingBalance,
    creditLimit,
    color,
    icon,
  } = parseInput(createAccountInputSchema, input, "createAccount input");

  const [settings] = await db
    .select({ displayCurrency: userSettings.displayCurrency })
    .from(userSettings)
    .where(eq(userSettings.userId, actorUserId))
    .limit(1);

  const accountCurrency = currency ?? settings?.displayCurrency ?? "USD";

  await assertCurrencyExists(accountCurrency);

  try {
    const [account] = await db
      .insert(financialAccounts)
      .values({
        userId: actorUserId,
        createdBy: actorUserId,
        name,
        type,
        currency: accountCurrency,
        visibility,
        openingBalance,
        balance: openingBalance,
        balanceUpdatedAt: new Date(),
        creditLimit,
        color,
        icon,
      })
      .returning();

    if (!account) {
      throw new ServiceError("INVALID_STATE", "Failed to create account");
    }

    return account;
  } catch (error) {
    if (isForeignKeyViolation(error)) {
      throw new ServiceError("VALIDATION_ERROR", `Unknown currency: ${accountCurrency}`);
    }

    throw error;
  }
}

// ---------------------------------------------------------------------------
// Read
// ---------------------------------------------------------------------------

/** Returns an account the actor can at least view. */
export async function getAccount(input: AccountLookupInput): Promise<SelectFinancialAccount> {
  const { actorUserId, accountId } = parseInput(
    accountLookupInputSchema,
    input,
    "getAccount input",
  );

  const { account } = await assertAccountAccess({
    actorUserId,
    accountId,
    required: "view",
  });

  return account;
}

/**
 * Accounts visible to the user: their own accounts plus `restricted` accounts
 * shared with them through `account_grants`.
 */
export async function listAccounts(
  input: ListAccountsInput,
): Promise<ReadonlyArray<SelectFinancialAccount>> {
  const { actorUserId, type, visibility, includeArchived } = parseInput(
    listAccountsInputSchema,
    input,
    "listAccounts input",
  );

  const accounts = await db
    .select()
    .from(financialAccounts)
    .where(
      and(
        eq(financialAccounts.userId, actorUserId),
        includeArchived ? undefined : isNull(financialAccounts.archivedAt),
        type === undefined ? undefined : eq(financialAccounts.type, type),
        visibility === undefined ? undefined : eq(financialAccounts.visibility, visibility),
      ),
    )
    .orderBy(asc(financialAccounts.createdAt));

  // Restricted accounts other users shared with us.
  const grantedRows = await db
    .select({ account: financialAccounts })
    .from(accountGrants)
    .innerJoin(financialAccounts, eq(financialAccounts.id, accountGrants.accountId))
    .where(eq(accountGrants.userId, actorUserId));

  const ownIds = new Set(accounts.map((account) => account.id));

  const grantedAccounts = grantedRows
    .map((row) => row.account)
    .filter(
      (account) =>
        !ownIds.has(account.id) &&
        account.visibility === "restricted" &&
        (includeArchived || !account.archivedAt) &&
        (type === undefined || account.type === type) &&
        (visibility === undefined || account.visibility === visibility),
    );

  return [...accounts, ...grantedAccounts].sort(
    (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
  );
}

/** Grants on an account, visible to anyone who can view the account. */
export async function listAccountGrants(
  input: AccountLookupInput,
): Promise<ReadonlyArray<SelectAccountGrant>> {
  const { actorUserId, accountId } = parseInput(
    accountLookupInputSchema,
    input,
    "listAccountGrants input",
  );

  await assertAccountAccess({ actorUserId, accountId, required: "view" });

  return db.select().from(accountGrants).where(eq(accountGrants.accountId, accountId));
}

// ---------------------------------------------------------------------------
// Update
// ---------------------------------------------------------------------------

/**
 * Updates descriptive fields. `type`, `currency` and `opening_balance` are
 * immutable: they define what the ledger means, so they are corrected with a
 * new account or an adjustment transaction instead.
 */
export async function updateAccount(input: UpdateAccountInput): Promise<SelectFinancialAccount> {
  const { actorUserId, accountId, name, visibility, creditLimit, color, icon } = parseInput(
    updateAccountInputSchema,
    input,
    "updateAccount input",
  );

  const { account } = await assertAccountAccess({
    actorUserId,
    accountId,
    required: "manage",
  });

  if (creditLimit === null && isCreditAccountType(account.type)) {
    throw new ServiceError(
      "INVALID_STATE",
      `A ${account.type} account must keep a credit limit`,
    );
  }

  const [updated] = await db
    .update(financialAccounts)
    .set({ name, visibility, creditLimit, color, icon })
    .where(eq(financialAccounts.id, accountId))
    .returning();

  if (!updated) {
    throw new ServiceError("NOT_FOUND", "Account not found for this user");
  }

  // Grants are meaningful only for restricted accounts.
  if (updated.visibility === "personal") {
    await db.delete(accountGrants).where(eq(accountGrants.accountId, accountId));
  }

  return updated;
}

/** Archives an account. Transactions keep referencing it. */
export async function archiveAccount(input: AccountLookupInput): Promise<SelectFinancialAccount> {
  const { actorUserId, accountId } = parseInput(
    accountLookupInputSchema,
    input,
    "archiveAccount input",
  );

  await assertAccountAccess({ actorUserId, accountId, required: "manage" });

  const [account] = await db
    .update(financialAccounts)
    .set({ archivedAt: new Date() })
    .where(and(eq(financialAccounts.id, accountId), isNull(financialAccounts.archivedAt)))
    .returning();

  if (!account) {
    throw new ServiceError("NOT_FOUND", "Account not found or already archived");
  }

  return account;
}

/** Restores an archived account. */
export async function unarchiveAccount(input: AccountLookupInput): Promise<SelectFinancialAccount> {
  const { actorUserId, accountId } = parseInput(
    accountLookupInputSchema,
    input,
    "unarchiveAccount input",
  );

  await assertAccountAccess({ actorUserId, accountId, required: "manage" });

  const [account] = await db
    .update(financialAccounts)
    .set({ archivedAt: null })
    .where(eq(financialAccounts.id, accountId))
    .returning();

  if (!account) {
    throw new ServiceError("NOT_FOUND", "Account not found for this user");
  }

  return account;
}

// ---------------------------------------------------------------------------
// Access grants
// ---------------------------------------------------------------------------

/**
 * Grants (or re-grants) another user access to a restricted account.
 * Only the account owner may grant access.
 */
export async function grantAccountAccess(
  input: GrantAccountAccessInput,
): Promise<SelectAccountGrant> {
  const { actorUserId, accountId, targetUserId, access } = parseInput(
    grantAccountAccessInputSchema,
    input,
    "grantAccountAccess input",
  );

  const account = await findOwnedAccount(actorUserId, accountId);

  if (!account) {
    throw new ServiceError("NOT_FOUND", "Account not found for this user");
  }

  if (account.visibility !== "restricted") {
    throw new ServiceError(
      "INVALID_STATE",
      "Grants only apply to restricted accounts; the owner can already see this one",
    );
  }

  if (targetUserId === actorUserId) {
    throw new ServiceError("VALIDATION_ERROR", "You already own this account");
  }

  try {
    const [grant] = await db
      .insert(accountGrants)
      .values({ accountId, userId: targetUserId, access, grantedBy: actorUserId })
      .onConflictDoUpdate({
        target: [accountGrants.accountId, accountGrants.userId],
        set: { access, grantedBy: actorUserId },
      })
      .returning();

    if (!grant) {
      throw new ServiceError("INVALID_STATE", "Failed to grant account access");
    }

    return grant;
  } catch (error) {
    if (isForeignKeyViolation(error)) {
      throw new ServiceError("VALIDATION_ERROR", "Unknown user");
    }
    throw error;
  }
}

/** Revokes a user's access to a restricted account. Owner only. */
export async function revokeAccountAccess(
  input: RevokeAccountAccessInput,
): Promise<SelectAccountGrant> {
  const { actorUserId, accountId, targetUserId } = parseInput(
    revokeAccountAccessInputSchema,
    input,
    "revokeAccountAccess input",
  );

  const account = await findOwnedAccount(actorUserId, accountId);

  if (!account) {
    throw new ServiceError("NOT_FOUND", "Account not found for this user");
  }

  const [grant] = await db
    .delete(accountGrants)
    .where(and(eq(accountGrants.accountId, accountId), eq(accountGrants.userId, targetUserId)))
    .returning();

  if (!grant) {
    throw new ServiceError("NOT_FOUND", "No grant exists for this user on this account");
  }

  return grant;
}
