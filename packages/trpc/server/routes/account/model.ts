import { z } from "zod";
import { uuidSchema } from "@repo/services/lib/schema";

const accountNameSchema = z.string().trim().min(1).max(120);
const accountIconSchema = z.string().trim().min(1).max(60);
const hexColorSchema = z
  .string()
  .trim()
  .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, "Must be a hex color like #4F46E5");

const accountTypeSchema = z.enum([
  "cash",
  "bank",
  "credit_card",
  "wallet",
  "investment",
  "loan",
  "other",
]);
const accountVisibilitySchema = z.enum(["space", "restricted"]);
const accountAccessSchema = z.enum(["view", "contribute", "manage"]);

/** Only these types carry a credit limit. */
const isCreditAccountType = (type: z.infer<typeof accountTypeSchema>): boolean =>
  type === "credit_card" || type === "loan";

// ------------------------------------------------------------------
// Helpers — same scale as the service schemas
// ------------------------------------------------------------------
const decimalPattern = /^\d+(\.\d{1,4})?$/;
const positiveDecimalPattern = /^(?!0+(\.0+)?$)\d+(\.\d{1,4})?$/;
const signedDecimalPattern = /^-?\d+(\.\d{1,4})?$/;

const money = z
  .union([z.number().nonnegative(), z.string().trim().regex(decimalPattern)])
  .transform((v) => Number(v).toFixed(4));

const positiveMoney = z
  .union([z.number().positive(), z.string().trim().regex(positiveDecimalPattern)])
  .transform((v) => Number(v).toFixed(4));

const signedMoney = z
  .union([z.number(), z.string().trim().regex(signedDecimalPattern)])
  .transform((v) => Number(v).toFixed(4));

// ------------------------------------------------------------------
// Input schemas
// ------------------------------------------------------------------

export const createAccountSchema = z
  .object({
    spaceId: uuidSchema,
    name: accountNameSchema,
    type: accountTypeSchema,
    currency: z.string().trim().min(3).max(10).optional(),
    visibility: accountVisibilitySchema.optional().default("space"),
    openingBalance: signedMoney.optional().default("0"),
    creditLimit: positiveMoney.optional(),
    color: hexColorSchema.optional(),
    icon: accountIconSchema.optional(),
  })
  .superRefine((value, ctx) => {
    if (isCreditAccountType(value.type) && value.creditLimit === undefined) {
      ctx.addIssue({
        code: "custom",
        path: ["creditLimit"],
        message: "creditLimit is required for credit_card and loan accounts",
      });
    }
  });

export const updateAccountSchema = z
  .object({
    spaceId: uuidSchema,
    accountId: uuidSchema,
    name: accountNameSchema.optional(),
    visibility: accountVisibilitySchema.optional(),
    creditLimit: positiveMoney.nullable().optional(),
    color: hexColorSchema.nullable().optional(),
    icon: accountIconSchema.nullable().optional(),
  })
  .refine(
    (v) =>
      v.name !== undefined ||
      v.visibility !== undefined ||
      v.creditLimit !== undefined ||
      v.color !== undefined ||
      v.icon !== undefined,
    { message: "Provide at least one field to update" },
  );

export const accountLookupSchema = z.object({
  spaceId: uuidSchema,
  accountId: uuidSchema,
});

export const listAccountsSchema = z.object({
  spaceId: uuidSchema,
  type: accountTypeSchema.optional(),
  visibility: accountVisibilitySchema.optional(),
  includeArchived: z.boolean().optional().default(false),
});

export const grantAccountAccessSchema = z.object({
  spaceId: uuidSchema,
  accountId: uuidSchema,
  targetUserId: z.string().trim().min(1).max(255),
  access: accountAccessSchema,
});

export const revokeAccountAccessSchema = z.object({
  spaceId: uuidSchema,
  accountId: uuidSchema,
  targetUserId: z.string().trim().min(1).max(255),
});
