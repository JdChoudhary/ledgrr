import { z } from "zod";
import { uuidSchema } from "@repo/services/lib/schema";
import { themeSchema } from "@repo/services/user-settings/model";

// -------------------------------------------------------------------
// User Settings
// -------------------------------------------------------------------

export const getUserSettingsSchema = z.object({});

export const updateUserSettingsSchema = z
  .object({
    displayCurrency: z.string().trim().min(3).max(10).optional(),
    locale: z.string().trim().min(2).max(10).optional(),
    timezone: z.string().trim().min(3).max(60).optional(),
    dateFormat: z.string().trim().min(1).max(30).optional(),
    weekStartDay: z.number().int().min(0).max(6).optional(),
    theme: themeSchema.optional(),
    defaultSpaceId: uuidSchema.nullable().optional(),
    autoPostRecurringTransactions: z.boolean().optional(),
    highSpendThreshold: z
      .union([z.number(), z.string().trim().min(1)])
      .nullable()
      .optional(),
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
