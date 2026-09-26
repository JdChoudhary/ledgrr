import { db, eq } from "@repo/database";
import { userSettings, type SelectUserSettings } from "@repo/database/schema";
import { ServiceError } from "../lib/errors";
import { parseInput } from "../lib/schema";
import {
  getUserSettingsInputSchema,
  updateUserSettingsInputSchema,
  type GetUserSettingsInput,
  type UpdateUserSettingsInput,
} from "./model";

/**
 * User-settings service.
 *
 * Each user owns exactly one settings row (unique constraint on user_id).
 * The row is upserted on first update so callers never need to check for
 * existence.
 */

// -------------------------------------------------------------------
// Read
// -------------------------------------------------------------------

/** Returns the user's settings, or throws NOT_FOUND if none exist. */
export async function getUserSettings(input: GetUserSettingsInput): Promise<SelectUserSettings> {
  const { actorUserId } = parseInput(getUserSettingsInputSchema, input, "getUserSettings input");

  const [settings] = await db
    .select()
    .from(userSettings)
    .where(eq(userSettings.userId, actorUserId))
    .limit(1);

  if (!settings) {
    throw new ServiceError("NOT_FOUND", "No settings found for this user");
  }

  return settings;
}

// -------------------------------------------------------------------
// Update (upsert)
// -------------------------------------------------------------------

/**
 * Updates the user's settings. Creates the row if it doesn't exist yet
 * (upsert via unique constraint).
 *
 * Only provided fields are changed; omitted fields keep their current value.
 */
export async function updateUserSettings(input: UpdateUserSettingsInput): Promise<SelectUserSettings> {
  const {
    actorUserId,
    displayCurrency,
    locale,
    timezone,
    dateFormat,
    weekStartDay,
    theme,
    autoPostRecurringTransactions,
    highSpendThreshold,
  } = parseInput(updateUserSettingsInputSchema, input, "updateUserSettings input");

  // Build only the fields that were explicitly provided
  const updates: Record<string, unknown> = {};
  if (displayCurrency !== undefined) updates.displayCurrency = displayCurrency;
  if (locale !== undefined) updates.locale = locale;
  if (timezone !== undefined) updates.timezone = timezone;
  if (dateFormat !== undefined) updates.dateFormat = dateFormat;
  if (weekStartDay !== undefined) updates.weekStartDay = weekStartDay;
  if (theme !== undefined) updates.theme = theme;
  if (autoPostRecurringTransactions !== undefined)
    updates.autoPostRecurringTransactions = autoPostRecurringTransactions;
  if (highSpendThreshold !== undefined) updates.highSpendThreshold = highSpendThreshold;

  if (Object.keys(updates).length === 0) {
    throw new ServiceError("VALIDATION_ERROR", "No fields to update");
  }

  // Upsert: insert a default row if none exists, then update
  const [existing] = await db
    .select({ id: userSettings.id })
    .from(userSettings)
    .where(eq(userSettings.userId, actorUserId))
    .limit(1);

  if (!existing) {
    // Insert with defaults + provided overrides
    const [created] = await db
      .insert(userSettings)
      .values({
        userId: actorUserId,
        displayCurrency: (updates.displayCurrency as string) ?? "USD",
        locale: (updates.locale as string) ?? "en-US",
        timezone: (updates.timezone as string) ?? "UTC",
        dateFormat: (updates.dateFormat as string) ?? "yyyy-MM-dd",
        weekStartDay: (updates.weekStartDay as number) ?? 0,
        theme: (updates.theme as "system" | "light" | "dark") ?? "system",
        autoPostRecurringTransactions: (updates.autoPostRecurringTransactions as boolean) ?? false,
        highSpendThreshold: (updates.highSpendThreshold as string | null) ?? null,
      })
      .returning();

    if (!created) {
      throw new ServiceError("INVALID_STATE", "Failed to create user settings");
    }

    return created;
  }

  const [updated] = await db
    .update(userSettings)
    .set(updates)
    .where(eq(userSettings.userId, actorUserId))
    .returning();

  if (!updated) {
    throw new ServiceError("INVALID_STATE", "Failed to update user settings");
  }

  return updated;
}
