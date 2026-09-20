import { z } from "zod";
import { ServiceError } from "./errors";

/**
 * Shared zod primitives for service inputs.
 *
 * Values are normalised (trimmed / upper-cased / fixed-scale) so that the
 * returned data is exactly what gets written to the database.
 */

export const uuidSchema = z.uuid();

/** `user.id` is text because Better Auth owns identity. */
export const userIdSchema = z.string().trim().min(1).max(255);

/** Matches the currencies table CHECK: `^[A-Z0-9]{3,10}$`. */
export const currencyCodeSchema = z
  .string()
  .trim()
  .min(3)
  .max(10)
  .transform((value) => value.toUpperCase())
  .pipe(z.string().regex(/^[A-Z0-9]{3,10}$/, "Must be a 3-10 character currency code"));

const decimalPattern = (scale: number) => new RegExp(`^\\d+(\\.\\d{1,${scale}})?$`);
const positiveDecimalPattern = (scale: number) =>
  new RegExp(`^(?!0+(\\.0+)?$)\\d+(\\.\\d{1,${scale}})?$`);

/**
 * Money is stored as numeric(precision, scale), which drizzle surfaces as a
 * string. Accept a number or a decimal string and normalise to fixed scale.
 */
export const moneySchema = (scale = 4) =>
  z
    .union([
      z.number().nonnegative(),
      z
        .string()
        .trim()
        .regex(decimalPattern(scale), `Must be a non-negative decimal with at most ${scale} places`),
    ])
    .transform((value) => Number(value).toFixed(scale));

export const positiveMoneySchema = (scale = 4) =>
  z
    .union([
      z.number().positive(),
      z
        .string()
        .trim()
        .regex(positiveDecimalPattern(scale), `Must be a positive decimal with at most ${scale} places`),
    ])
    .transform((value) => Number(value).toFixed(scale));

/** Signed money for balances, which may legitimately be negative. */
export const signedMoneySchema = (scale = 4) =>
  z
    .union([
      z.number(),
      z
        .string()
        .trim()
        .regex(new RegExp(`^-?\\d+(\\.\\d{1,${scale}})?$`), `Must be a decimal with at most ${scale} places`),
    ])
    .transform((value) => Number(value).toFixed(scale));

export const hexColorSchema = z
  .string()
  .trim()
  .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, "Must be a hex color like #4F46E5");

export const dateSchema = z.iso.date();

/**
 * Validates `input` against `schema` and throws a `ServiceError` with a flat
 * list of field errors when it fails.
 */
export const parseInput = <TSchema extends z.ZodType>(
  schema: TSchema,
  input: unknown,
  label: string,
): z.output<TSchema> => {
  const result = schema.safeParse(input);

  if (!result.success) {
    const details = result.error.issues.map(
      (issue) => `${issue.path.join(".") || "input"}: ${issue.message}`,
    );

    throw new ServiceError("VALIDATION_ERROR", `Invalid ${label}`, details);
  }

  return result.data;
};
