import { z } from "zod";
import {
  currencyCodeSchema,
  userIdSchema,
  uuidSchema,
  signedMoneySchema,
} from "../lib/schema";

/**
 * Input contracts for the user-settings service.
 *
 * Each user has exactly one settings row (unique on user_id).
 * Settings control display preferences, defaults, and notification thresholds.
 */

export const themeSchema = z.enum(["system", "light", "dark"]);
export type Theme = z.infer<typeof themeSchema>;

// -------------------------------------------------------------------
// Update (upsert — settings row is created on first update or signup)
// -------------------------------------------------------------------

export const updateUserSettingsInputSchema = z
  .object({
    actorUserId: userIdSchema,
    displayCurrency: currencyCodeSchema.optional(),
    locale: z.string().trim().min(2).max(10).optional(),
    timezone: z.string().trim().min(3).max(60).optional(),
    dateFormat: z.string().trim().min(1).max(30).optional(),
    weekStartDay: z.number().int().min(0).max(6).optional(),
    theme: themeSchema.optional(),
    defaultSpaceId: uuidSchema.nullable().optional(),
    autoPostRecurringTransactions: z.boolean().optional(),
    highSpendThreshold: signedMoneySchema().nullable().optional(),
  })
  .refine(
    (v) =>
      v.displayCurrency !== undefined ||
      v.locale !== undefined ||
      v.timezone !== undefined ||
      v.dateFormat !== undefined ||
      v.weekStartDay !== undefined ||
      v.theme !== undefined ||
      v.defaultSpaceId !== undefined ||
      v.autoPostRecurringTransactions !== undefined ||
      v.highSpendThreshold !== undefined,
    { message: "Provide at least one field to update" },
  );

export type UpdateUserSettingsInput = z.input<typeof updateUserSettingsInputSchema>;

// -------------------------------------------------------------------
// Read
// -------------------------------------------------------------------

export const getUserSettingsInputSchema = z.object({
  actorUserId: userIdSchema,
});

export type GetUserSettingsInput = z.input<typeof getUserSettingsInputSchema>;
