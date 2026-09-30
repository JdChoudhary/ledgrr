import { z } from "zod";
import { currencyCodeSchema, userIdSchema } from "../lib/schema";

/**
 * Input contracts for the currency service.
 *
 * Currencies are global reference data: reading is open, writing is
 * admin-only (`user.role = "admin"`, owned by Better Auth). The database
 * CHECKs (`code` format, `minor_units` 0..6) remain the last line of defence.
 */

export const currencyNameSchema = z.string().trim().min(1).max(100);
export const currencySymbolSchema = z.string().trim().min(1).max(10);

/**
 * Bootstrapped on every signup so the default base currency always exists
 * before any transaction can reference it. Idempotent.
 */
export const DEFAULT_BASE_CURRENCY = {
  code: "USD",
  name: "US Dollar",
  symbol: "$",
  minorUnits: 2,
} as const;

export type EnsureCurrencyInput = {
  code: string;
  name: string;
  symbol: string;
  minorUnits: number;
};

// ---------------------------------------------------------------------------
// Admin mutations
// ---------------------------------------------------------------------------

export const createCurrencyInputSchema = z.object({
  actorUserId: userIdSchema,
  code: currencyCodeSchema,
  name: currencyNameSchema,
  symbol: currencySymbolSchema,
  minorUnits: z.number().int().min(0).max(6),
});

export type CreateCurrencyInput = z.input<typeof createCurrencyInputSchema>;

export const updateCurrencyInputSchema = z
  .object({
    actorUserId: userIdSchema,
    code: currencyCodeSchema,
    name: currencyNameSchema.optional(),
    symbol: currencySymbolSchema.optional(),
    minorUnits: z.number().int().min(0).max(6).optional(),
    isActive: z.boolean().optional(),
  })
  .refine(
    (value) =>
      value.name !== undefined ||
      value.symbol !== undefined ||
      value.minorUnits !== undefined ||
      value.isActive !== undefined,
    { message: "Provide at least one field to update" },
  );

export type UpdateCurrencyInput = z.input<typeof updateCurrencyInputSchema>;

export const currencyStatusInputSchema = z.object({
  actorUserId: userIdSchema,
  code: currencyCodeSchema,
  isActive: z.boolean(),
});

export type CurrencyStatusInput = z.input<typeof currencyStatusInputSchema>;

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export const currencyLookupSchema = z.object({
  code: currencyCodeSchema,
});

export type CurrencyLookupInput = z.input<typeof currencyLookupSchema>;

export const listCurrenciesInputSchema = z.object({
  includeInactive: z.boolean().optional().default(false),
});

export type ListCurrenciesInput = z.input<typeof listCurrenciesInputSchema>;
