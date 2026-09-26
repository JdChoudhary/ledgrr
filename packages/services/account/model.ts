import { z } from "zod";
import {
  currencyCodeSchema,
  hexColorSchema,
  positiveMoneySchema,
  signedMoneySchema,
  userIdSchema,
  uuidSchema,
} from "../lib/schema";

/**
 * Input contracts for the financial account service.
 *
 * Every account belongs to exactly one user:
 *
 *   personal account   -> visible to its owner
 *   restricted account -> account_grants grant access to other users
 *
 * `opening_balance` / `balance` arrive as numeric strings so no value is ever
 * rounded twice on the way to `numeric(19,4)`.
 */

export const accountTypeSchema = z.enum([
  "cash",
  "bank",
  "credit_card",
  "wallet",
  "investment",
  "loan",
  "other",
]);

export const accountVisibilitySchema = z.enum(["personal", "restricted"]);
export const accountAccessSchema = z.enum(["view", "contribute", "manage"]);

export type AccountType = z.infer<typeof accountTypeSchema>;
export type AccountVisibility = z.infer<typeof accountVisibilitySchema>;
export type AccountAccess = z.infer<typeof accountAccessSchema>;

/** Only these types carry a credit limit (enforced by a DB CHECK too). */
export const isCreditAccountType = (type: AccountType): boolean =>
  type === "credit_card" || type === "loan";

const accountNameSchema = z.string().trim().min(1).max(120);
const accountIconSchema = z.string().trim().min(1).max(60);

export const createAccountInputSchema = z
  .object({
    actorUserId: userIdSchema,
    name: accountNameSchema,
    type: accountTypeSchema,
    /** Defaults to the user's base currency. */
    currency: currencyCodeSchema.optional(),
    visibility: accountVisibilitySchema.optional().default("personal"),
    openingBalance: signedMoneySchema().optional().default("0"),
    creditLimit: positiveMoneySchema().optional(),
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

export type CreateAccountInput = z.input<typeof createAccountInputSchema>;

/**
 * Only descriptive fields are updatable: `type`, `currency` and
 * `opening_balance` define the account's financial meaning, so correcting them
 * means creating a new account or posting an adjustment transaction.
 */
export const updateAccountInputSchema = z
  .object({
    actorUserId: userIdSchema,
    accountId: uuidSchema,
    name: accountNameSchema.optional(),
    visibility: accountVisibilitySchema.optional(),
    /** `null` clears the limit; refused for credit_card / loan accounts. */
    creditLimit: positiveMoneySchema().nullable().optional(),
    color: hexColorSchema.nullable().optional(),
    icon: accountIconSchema.nullable().optional(),
  })
  .refine(
    (value) =>
      value.name !== undefined ||
      value.visibility !== undefined ||
      value.creditLimit !== undefined ||
      value.color !== undefined ||
      value.icon !== undefined,
    { message: "Provide at least one field to update" },
  );

export type UpdateAccountInput = z.input<typeof updateAccountInputSchema>;

export const accountLookupInputSchema = z.object({
  actorUserId: userIdSchema,
  accountId: uuidSchema,
});

export type AccountLookupInput = z.input<typeof accountLookupInputSchema>;

export const listAccountsInputSchema = z.object({
  actorUserId: userIdSchema,
  type: accountTypeSchema.optional(),
  visibility: accountVisibilitySchema.optional(),
  includeArchived: z.boolean().optional().default(false),
});

export type ListAccountsInput = z.input<typeof listAccountsInputSchema>;

export const grantAccountAccessInputSchema = accountLookupInputSchema.extend({
  /** The user receiving access. */
  targetUserId: userIdSchema,
  access: accountAccessSchema,
});

export type GrantAccountAccessInput = z.input<typeof grantAccountAccessInputSchema>;

export const revokeAccountAccessInputSchema = accountLookupInputSchema.extend({
  targetUserId: userIdSchema,
});

export type RevokeAccountAccessInput = z.input<typeof revokeAccountAccessInputSchema>;
