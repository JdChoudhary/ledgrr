import { and, asc, db, eq, isNull } from "@repo/database";
import {
  accountGrants,
  financialAccounts,
  spaces,
  type SelectAccountGrant,
  type SelectFinancialAccount,
} from "@repo/database/schema";
import { ServiceError, isForeignKeyViolation } from "../lib/errors";
import { parseInput } from "../lib/schema";
import { assertActiveSpaceMember, assertCurrencyExists, assertSpaceRole } from "../space";
import type { SpaceMemberRole } from "../space/model";
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
 * Accounts belong to exactly one space, and `space_members` is the default
 * authorization boundary. Restricted accounts narrow that boundary with
 * `account_grants`: effective access is MIN(space capability, grant).
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

/** Space role as an upper bound on account capability. */
const ROLE_ACCESS: Record<SpaceMemberRole, EffectiveAccountAccess> = {
  owner: "manage",
  admin: "manage",
  member: "contribute",
  viewer: "view",
  advisor: "view",
};

const findAccount = async (
  spaceId: string,
  accountId: string,
): Promise<SelectFinancialAccount | undefined> => {
  const [account] = await db
    .select()
    .from(financialAccounts)
    .where(and(eq(financialAccounts.id, accountId), eq(financialAccounts.spaceId, spaceId)))
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
 * Effective access for a member: `space` accounts follow the space role, while
 * `restricted` accounts additionally require a grant (owner/admin administer
 * them so they always keep manage access).
 */
export async function resolveAccountAccess(
  account: SelectFinancialAccount,
  role: SpaceMemberRole,
  userId: string,
): Promise<EffectiveAccountAccess> {
  const roleAccess = ROLE_ACCESS[role];

  if (account.visibility === "space") {
    return roleAccess;
  }

  if (roleAccess === "manage") {
    return "manage";
  }

  const grantAccess = await findGrantAccess(account.id, userId);

  if (!grantAccess) {
    return "none";
  }

  // MIN(space capability, grant).
  return ACCESS_RANK[grantAccess] < ACCESS_RANK[roleAccess] ? grantAccess : roleAccess;
}

/**
 * Throws unless the actor has at least `required` access to the account.
 * Reused by the transaction service before money moves.
 */
export async function assertAccountAccess(input: {
  spaceId: string;
  actorUserId: string;
  accountId: string;
  required?: EffectiveAccountAccess;
}): Promise<{ account: SelectFinancialAccount; access: EffectiveAccountAccess }> {
  const { spaceId, actorUserId, accountId, required = "view" } = input;

  const membership = await assertActiveSpaceMember({ spaceId, userId: actorUserId });

  const account = await findAccount(spaceId, accountId);

  if (!account) {
    throw new ServiceError("NOT_FOUND", "Account not found in this space");
  }

  const access = await resolveAccountAccess(account, membership.role, actorUserId);

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
 * Creates an account in the space the actor belongs to.
 *
 * `balance` starts at `opening_balance`; every later change comes from posted
 * transactions.
 */
export async function createAccount(input: CreateAccountInput): Promise<SelectFinancialAccount> {
  const {
    spaceId,
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

  await assertActiveSpaceMember({ spaceId, userId: actorUserId });

  const [space] = await db
    .select({ baseCurrency: spaces.baseCurrency })
    .from(spaces)
    .where(eq(spaces.id, spaceId))
    .limit(1);

  if (!space) {
    throw new ServiceError("NOT_FOUND", "Space not found");
  }

  const accountCurrency = currency ?? space.baseCurrency;

  await assertCurrencyExists(accountCurrency);

  try {
    const [account] = await db
      .insert(financialAccounts)
      .values({
        spaceId,
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
  const { spaceId, actorUserId, accountId } = parseInput(
    accountLookupInputSchema,
    input,
    "getAccount input",
  );

  const { account } = await assertAccountAccess({
    spaceId,
    actorUserId,
    accountId,
    required: "view",
  });

  return account;
}

/**
 * Accounts in the space, filtered by what the actor may see: `space` accounts
 * follow space membership, `restricted` accounts need a grant (owner/admin see
 * everything).
 */
export async function listAccounts(
  input: ListAccountsInput,
): Promise<ReadonlyArray<SelectFinancialAccount>> {
  const { spaceId, actorUserId, type, visibility, includeArchived } = parseInput(
    listAccountsInputSchema,
    input,
    "listAccounts input",
  );

  const membership = await assertActiveSpaceMember({ spaceId, userId: actorUserId });

  const accounts = await db
    .select()
    .from(financialAccounts)
    .where(
      and(
        eq(financialAccounts.spaceId, spaceId),
        includeArchived ? undefined : isNull(financialAccounts.archivedAt),
        type === undefined ? undefined : eq(financialAccounts.type, type),
        visibility === undefined ? undefined : eq(financialAccounts.visibility, visibility),
      ),
    )
    .orderBy(asc(financialAccounts.createdAt));

  if (ROLE_ACCESS[membership.role] === "manage") {
    return accounts;
  }

  const grants = await db
    .select({ accountId: accountGrants.accountId, access: accountGrants.access })
    .from(accountGrants)
    .where(and(eq(accountGrants.spaceId, spaceId), eq(accountGrants.userId, actorUserId)));

  const grantedAccountIds = new Set(grants.map((grant) => grant.accountId));

  return accounts.filter(
    (account) => account.visibility === "space" || grantedAccountIds.has(account.id),
  );
}

/** Grants on an account, visible to anyone who can view the account. */
export async function listAccountGrants(
  input: AccountLookupInput,
): Promise<ReadonlyArray<SelectAccountGrant>> {
  const { spaceId, actorUserId, accountId } = parseInput(
    accountLookupInputSchema,
    input,
    "listAccountGrants input",
  );

  await assertAccountAccess({ spaceId, actorUserId, accountId, required: "view" });

  return db
    .select()
    .from(accountGrants)
    .where(and(eq(accountGrants.spaceId, spaceId), eq(accountGrants.accountId, accountId)));
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
  const { spaceId, actorUserId, accountId, name, visibility, creditLimit, color, icon } = parseInput(
    updateAccountInputSchema,
    input,
    "updateAccount input",
  );

  const { account } = await assertAccountAccess({
    spaceId,
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
    .where(and(eq(financialAccounts.id, accountId), eq(financialAccounts.spaceId, spaceId)))
    .returning();

  if (!updated) {
    throw new ServiceError("NOT_FOUND", "Account not found in this space");
  }

  // Grants are meaningful only for restricted accounts.
  if (updated.visibility === "space") {
    await db
      .delete(accountGrants)
      .where(and(eq(accountGrants.spaceId, spaceId), eq(accountGrants.accountId, accountId)));
  }

  return updated;
}

/** Archives an account. Transactions keep referencing it. */
export async function archiveAccount(input: AccountLookupInput): Promise<SelectFinancialAccount> {
  const { spaceId, actorUserId, accountId } = parseInput(
    accountLookupInputSchema,
    input,
    "archiveAccount input",
  );

  await assertAccountAccess({ spaceId, actorUserId, accountId, required: "manage" });

  const [account] = await db
    .update(financialAccounts)
    .set({ archivedAt: new Date() })
    .where(
      and(
        eq(financialAccounts.id, accountId),
        eq(financialAccounts.spaceId, spaceId),
        isNull(financialAccounts.archivedAt),
      ),
    )
    .returning();

  if (!account) {
    throw new ServiceError("NOT_FOUND", "Account not found or already archived");
  }

  return account;
}

/** Restores an archived account. */
export async function unarchiveAccount(input: AccountLookupInput): Promise<SelectFinancialAccount> {
  const { spaceId, actorUserId, accountId } = parseInput(
    accountLookupInputSchema,
    input,
    "unarchiveAccount input",
  );

  await assertAccountAccess({ spaceId, actorUserId, accountId, required: "manage" });

  const [account] = await db
    .update(financialAccounts)
    .set({ archivedAt: null })
    .where(and(eq(financialAccounts.id, accountId), eq(financialAccounts.spaceId, spaceId)))
    .returning();

  if (!account) {
    throw new ServiceError("NOT_FOUND", "Account not found in this space");
  }

  return account;
}

// ---------------------------------------------------------------------------
// Access grants
// ---------------------------------------------------------------------------

/**
 * Grants (or re-grants) a space member access to a restricted account.
 * Owner/admin only, and the grantee must be an active member of the space.
 */
export async function grantAccountAccess(
  input: GrantAccountAccessInput,
): Promise<SelectAccountGrant> {
  const { spaceId, actorUserId, accountId, targetUserId, access } = parseInput(
    grantAccountAccessInputSchema,
    input,
    "grantAccountAccess input",
  );

  await assertSpaceRole({ spaceId, userId: actorUserId, roles: ["owner", "admin"] });

  const account = await findAccount(spaceId, accountId);

  if (!account) {
    throw new ServiceError("NOT_FOUND", "Account not found in this space");
  }

  if (account.visibility !== "restricted") {
    throw new ServiceError(
      "INVALID_STATE",
      "Grants only apply to restricted accounts; every space member can already see this one",
    );
  }

  try {
    await assertActiveSpaceMember({ spaceId, userId: targetUserId });
  } catch {
    throw new ServiceError("VALIDATION_ERROR", "The user must be an active member of this space");
  }

  const [grant] = await db
    .insert(accountGrants)
    .values({ accountId, spaceId, userId: targetUserId, access, grantedBy: actorUserId })
    .onConflictDoUpdate({
      target: [accountGrants.accountId, accountGrants.userId],
      set: { access, grantedBy: actorUserId },
    })
    .returning();

  if (!grant) {
    throw new ServiceError("INVALID_STATE", "Failed to grant account access");
  }

  return grant;
}

/** Revokes a member's access to a restricted account. Owner/admin only. */
export async function revokeAccountAccess(
  input: RevokeAccountAccessInput,
): Promise<SelectAccountGrant> {
  const { spaceId, actorUserId, accountId, targetUserId } = parseInput(
    revokeAccountAccessInputSchema,
    input,
    "revokeAccountAccess input",
  );

  await assertSpaceRole({ spaceId, userId: actorUserId, roles: ["owner", "admin"] });

  const [grant] = await db
    .delete(accountGrants)
    .where(
      and(
        eq(accountGrants.spaceId, spaceId),
        eq(accountGrants.accountId, accountId),
        eq(accountGrants.userId, targetUserId),
      ),
    )
    .returning();

  if (!grant) {
    throw new ServiceError("NOT_FOUND", "No grant exists for this user on this account");
  }

  return grant;
}
