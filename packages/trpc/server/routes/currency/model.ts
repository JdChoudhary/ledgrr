import { z } from "zod";

const currencyCodeSchema = z
  .string()
  .trim()
  .min(3)
  .max(10)
  .transform((value) => value.toUpperCase())
  .pipe(z.string().regex(/^[A-Z0-9]{3,10}$/, "Must be a 3-10 character currency code"));

const currencyNameSchema = z.string().trim().min(1).max(100);
const currencySymbolSchema = z.string().trim().min(1).max(10);

export const createCurrencySchema = z.object({
  code: currencyCodeSchema,
  name: currencyNameSchema,
  symbol: currencySymbolSchema,
  minorUnits: z.number().int().min(0).max(6),
});

export const updateCurrencySchema = z
  .object({
    code: currencyCodeSchema,
    name: currencyNameSchema.optional(),
    symbol: currencySymbolSchema.optional(),
    minorUnits: z.number().int().min(0).max(6).optional(),
    isActive: z.boolean().optional(),
  })
  .refine(
    (v) =>
      v.name !== undefined ||
      v.symbol !== undefined ||
      v.minorUnits !== undefined ||
      v.isActive !== undefined,
    { message: "Provide at least one field to update" },
  );

export const currencyStatusSchema = z.object({
  code: currencyCodeSchema,
  isActive: z.boolean(),
});

export const currencyLookupSchema = z.object({
  code: currencyCodeSchema,
});

export const listCurrenciesSchema = z.object({
  includeInactive: z.boolean().optional().default(false),
});
