import { asc, eq } from "@repo/database";
import { db } from "@repo/database";
import {
  currencies,
  user,
  type SelectCurrency,
} from "@repo/database/schema";
import { ServiceError, isUniqueViolation } from "../lib/errors";
import { parseInput } from "../lib/schema";
import {
  DEFAULT_BASE_CURRENCY,
  createCurrencyInputSchema,
  currencyLookupSchema,
  currencyStatusInputSchema,
  listCurrenciesInputSchema,
  updateCurrencyInputSchema,
  type CreateCurrencyInput,
  type CurrencyLookupInput,
  type CurrencyStatusInput,
  type EnsureCurrencyInput,
  type ListCurrenciesInput,
  type UpdateCurrencyInput,
} from "./model";

/**
 * Currency service.
 *
 * Currencies are global reference data shared by every user. Reads are open
 * to any authenticated user; writes are restricted to admins
 * (`user.role = "admin"`, as managed by Better Auth's admin plugin).
 *
 * Every exported function is standalone callable: it validates its own input
 * and maps database errors to typed `ServiceError`s. The database CHECKs
 * (`code ~ '^[A-Z0-9]{3,10}$'`, `minor_units BETWEEN 0 AND 6`) stay the last
 * line of defence.
 */

const ADMIN_ROLE = "admin";

/**
 * Throws unless the currency code is registered reference data.
 *
 * Shared with the account / goal / transaction services for reference checks.
 */
export const assertCurrencyExists = async (code: string): Promise<void> => {
  const [currency] = await db
    .select({ code: currencies.code })
    .from(currencies)
    .where(eq(currencies.code, code))
    .limit(1);

  if (!currency) {
    throw new ServiceError("VALIDATION_ERROR", `Unknown currency: ${code}`, [
      `Currency ${code} is not registered in the currencies table`,
    ]);
  }
};

/**
 * Throws unless `userId` holds the admin role. Kept here (not in lib/) until a
 * second admin service needs it — duplication beats a premature abstraction.
 */
const assertAdmin = async (userId: string): Promise<void> => {
  const [row] = await db
    .select({ role: user.role })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);

  if (!row) {
    throw new ServiceError("NOT_FOUND", "User not found");
  }

  if (row.role !== ADMIN_ROLE) {
    throw new ServiceError("FORBIDDEN", "Only admins can manage currencies");
  }
};

// ---------------------------------------------------------------------------
// Bootstrap — called on signup so USD always exists
// ---------------------------------------------------------------------------

/**
 * Idempotently ensures the default base currency (USD) exists. Runs inside
 * the signup hook so the first transaction never dies on a missing
 * `currencies` row. Never throws for an existing row
 * (`ON CONFLICT DO NOTHING`), and concurrency-safe.
 */
export const ensureBaseCurrency = async (): Promise<SelectCurrency> => {
  const [currency] = await db
    .insert(currencies)
    .values({ ...DEFAULT_BASE_CURRENCY })
    .onConflictDoNothing({ target: currencies.code })
    .returning();

  if (currency) {
    return currency;
  }

  // Lost a race or already seeded: read the winner.
  return getCurrency({ code: DEFAULT_BASE_CURRENCY.code });
};

/**
 * Idempotently ensures any currency exists (upsert semantics, insert-only).
 * Used by admins to (re-)provision a currency without clobbering it.
 */
export const ensureCurrency = async (input: EnsureCurrencyInput): Promise<SelectCurrency> => {
  const [currency] = await db
    .insert(currencies)
    .values({ ...input })
    .onConflictDoNothing({ target: currencies.code })
    .returning();

  if (currency) {
    return currency;
  }

  return getCurrency({ code: input.code });
};

// ---------------------------------------------------------------------------
// Queries — open to any authenticated user
// ---------------------------------------------------------------------------

export const getCurrency = async (input: CurrencyLookupInput): Promise<SelectCurrency> => {
  const { code } = parseInput(currencyLookupSchema, input, "currency lookup");

  const [currency] = await db
    .select()
    .from(currencies)
    .where(eq(currencies.code, code))
    .limit(1);

  if (!currency) {
    throw new ServiceError("NOT_FOUND", `Currency ${code} not found`);
  }

  return currency;
};

/**
 * Lists active currencies (all currencies when `includeInactive` is set).
 * This is what currency pickers call.
 */
export const listCurrencies = async (
  input: ListCurrenciesInput,
): Promise<ReadonlyArray<SelectCurrency>> => {
  const { includeInactive } = parseInput(listCurrenciesInputSchema, input, "list currencies");

  return db
    .select()
    .from(currencies)
    .where(includeInactive ? undefined : eq(currencies.isActive, true))
    .orderBy(asc(currencies.code));
};

// ---------------------------------------------------------------------------
// Admin mutations
// ---------------------------------------------------------------------------

export const createCurrency = async (input: CreateCurrencyInput): Promise<SelectCurrency> => {
  const { actorUserId, ...currency } = parseInput(
    createCurrencyInputSchema,
    input,
    "create currency input",
  );

  await assertAdmin(actorUserId);

  try {
    const [created] = await db.insert(currencies).values(currency).returning();

    if (!created) {
      throw new ServiceError("INVALID_STATE", "Failed to create currency");
    }

    return created;
  } catch (error) {
    if (isUniqueViolation(error, "currencies_pkey")) {
      throw new ServiceError("CONFLICT", `Currency ${currency.code} already exists`);
    }

    throw error;
  }
};

export const updateCurrency = async (input: UpdateCurrencyInput): Promise<SelectCurrency> => {
  const { actorUserId, code, ...updates } = parseInput(
    updateCurrencyInputSchema,
    input,
    "update currency input",
  );

  await assertAdmin(actorUserId);

  const [currency] = await db
    .update(currencies)
    .set(updates)
    .where(eq(currencies.code, code))
    .returning();

  if (!currency) {
    throw new ServiceError("NOT_FOUND", `Currency ${code} not found`);
  }

  return currency;
};

/** Soft-disables a currency so it disappears from pickers but keeps history. */
export const deactivateCurrency = async (input: CurrencyStatusInput): Promise<SelectCurrency> => {
  const { actorUserId, code, isActive } = parseInput(
    currencyStatusInputSchema,
    input,
    "currency status input",
  );

  await assertAdmin(actorUserId);

  const [currency] = await db
    .update(currencies)
    .set({ isActive })
    .where(eq(currencies.code, code))
    .returning();

  if (!currency) {
    throw new ServiceError("NOT_FOUND", `Currency ${code} not found`);
  }

  return currency;
};

export const activateCurrency = async (input: CurrencyStatusInput): Promise<SelectCurrency> => {
  return deactivateCurrency(input);
};
