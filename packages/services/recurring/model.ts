import { z } from "zod";
import {
  currencyCodeSchema,
  dateSchema,
  moneySchema,
  positiveMoneySchema,
  userIdSchema,
  uuidSchema,
} from "../lib/schema";

/**
 * Input contracts for the recurring service.
 *
 * A rule is the template: type + amount + schedule. When a run fires it
 * produces a normal transaction (posted, `recurring_rule_id` set) plus a log
 * row (one per scheduled date, unique per rule). The transaction service owns
 * the actual posting; this service owns schedules and catch-up.
 */

// ---------------------------------------------------------------------------
// Schedule primitives
// ---------------------------------------------------------------------------

export const recurringFrequencySchema = z.enum([
  "daily",
  "weekly",
  "monthly",
  "yearly",
]);

export const recurringStatusSchema = z.enum([
  "active",
  "paused",
  "completed",
  "cancelled",
]);

/**
 * Schedule details. Which fields are required depends on the frequency:
 *   daily   -> interval only
 *   weekly  -> interval + dayOfWeek (0=Sun .. 6=Sat)
 *   monthly -> interval + dayOfMonth (1..31, clamped to month length)
 *   yearly  -> interval only (anniversary of the start date)
 */
export const scheduleSchema = z
  .object({
    frequency: recurringFrequencySchema,
    interval: z.number().int().min(1).max(365),
    dayOfWeek: z.number().int().min(0).max(6).nullable().optional(),
    dayOfMonth: z.number().int().min(1).max(31).nullable().optional(),
  })
  .refine(
    (v) => v.frequency !== "weekly" || v.dayOfWeek != null,
    { message: "A weekly schedule needs a day of week", path: ["dayOfWeek"] },
  )
  .refine(
    (v) => v.frequency !== "monthly" || v.dayOfMonth != null,
    { message: "A monthly schedule needs a day of month", path: ["dayOfMonth"] },
  );

export type ScheduleInput = z.input<typeof scheduleSchema>;

// ---------------------------------------------------------------------------
// Create
// ---------------------------------------------------------------------------

/**
 * Split configuration stored on a rule: every auto-posted occurrence is
 * created as a bill split with these participants. Share values follow the
 * transaction service's `billSplitInputSchema` semantics; the creator must
 * be among the participants (they are the pay-by anchor).
 */
export const ruleSplitConfigSchema = z.object({
  title: z.string().trim().min(1).max(200),
  participants: z
    .array(
      z.object({
        userId: userIdSchema.nullable().optional(),
        contactId: uuidSchema.nullable().optional(),
        name: z.string().trim().max(120).nullable().optional(),
        shareType: z.enum(["equal", "exact", "percentage", "shares"]),
        shareValue: z.string().trim().nullable().optional(),
      }),
    )
    .min(2)
    .max(50),
});

export type RuleSplitConfig = z.infer<typeof ruleSplitConfigSchema>;

export const createRuleInputSchema = z.object({
  actorUserId: userIdSchema,

  type: z.enum(["income", "expense", "transfer"]),
  amount: positiveMoneySchema(),
  description: z.string().trim().min(1).max(500),

  schedule: scheduleSchema,

  accountId: uuidSchema.nullable().optional(),
  destinationAccountId: uuidSchema.nullable().optional(),
  categoryId: uuidSchema.nullable().optional(),
  merchantId: uuidSchema.nullable().optional(),
  currency: currencyCodeSchema.optional(),

  /** First occurrence. Defaults to today. */
  startDate: dateSchema.nullable().optional(),
  /** Optional end of the series. */
  endDate: dateSchema.nullable().optional(),

  /**
   * Auto-post: occurrences become posted transactions automatically during
   * lazy catch-up. Requires an account (DB constraint enforces this too) —
   * without an account the rule can only remind.
   */
  autoPost: z.boolean().nullable().optional(),
  /** Notify this many days before each occurrence. */
  remindDaysBefore: z.number().int().min(0).max(365).nullable().optional(),

  /**
   * When set, every posted occurrence is a bill split with these
   * participants. Requires type=expense and autoPost=true (there is nothing
   * to remind about for splits — the debts must exist).
   */
  splitConfig: ruleSplitConfigSchema.nullable().optional(),
});

export type CreateRuleInput = z.input<typeof createRuleInputSchema>;

// ---------------------------------------------------------------------------
// Read / mutate
// ---------------------------------------------------------------------------

export const listRulesInputSchema = z.object({
  actorUserId: userIdSchema,
  status: recurringStatusSchema.optional(),
});

export type ListRulesInput = z.input<typeof listRulesInputSchema>;

export const ruleLookupSchema = z.object({
  ruleId: uuidSchema,
  actorUserId: userIdSchema,
});

export const updateRuleStatusSchema = z.object({
  ruleId: uuidSchema,
  actorUserId: userIdSchema,
  status: z.enum(["active", "paused", "cancelled"]),
});

// ---------------------------------------------------------------------------
// Outputs
// ---------------------------------------------------------------------------

/**
 * Split config as returned to clients: every optional field is normalized to
 * an explicit null so the shape is stable (no undefined vs null mismatch).
 */
export type RuleSplitConfigNormalized = {
  title: string;
  participants: {
    userId: string | null;
    contactId: string | null;
    name: string | null;
    shareType: "equal" | "exact" | "percentage" | "shares";
    shareValue: string | null;
  }[];
};

export type RecurringRuleListItem = {
  id: string;
  userId: string;
  createdBy: string;
  accountId: string | null;
  destinationAccountId: string | null;
  categoryId: string | null;
  merchantId: string | null;
  type: "income" | "expense" | "transfer";
  amountMode: "fixed" | "variable";
  amount: string;
  currency: string;
  description: string;
  frequency: "daily" | "weekly" | "monthly" | "yearly";
  interval: number;
  dayOfWeek: number | null;
  dayOfMonth: number | null;
  autoPost: boolean;
  remindDaysBefore: number | null;
  splitConfig: RuleSplitConfigNormalized | null;
  startDate: string;
  nextRunDate: string;
  endDate: string | null;
  status: "active" | "paused" | "completed" | "cancelled";
  lastRunAt: Date | null;
};

export type RuleLog = {
  id: string;
  ruleId: string;
  transactionId: string | null;
  scheduledFor: string;
  status: "success" | "skipped" | "failed";
  errorMessage: string | null;
};

// ---------------------------------------------------------------------------
// Occurrences (calendar view)
// ---------------------------------------------------------------------------

export const listOccurrencesInputSchema = z.object({
  actorUserId: userIdSchema,
  month: z.string().regex(/^\d{4}-\d{2}$/), // YYYY-MM
});

export type ListOccurrencesInput = z.input<typeof listOccurrencesInputSchema>;

export type ProjectedOccurrence = {
  /** Synthetic id: `projected:<ruleId>:<YYYY-MM-DD>`. Never persisted. */
  id: string;
  ruleId: string;
  scheduledFor: string;
  ruleDescription: string;
  ruleAmount: string;
  ruleCurrency: string;
  ruleType: "income" | "expense" | "transfer";
  ruleAmountMode: "fixed" | "variable";
  ruleAccountId: string | null;
  ruleCategoryId: string | null;
  ruleMerchantId: string | null;
  ruleFrequency: string;
  ruleInterval: number;
};

export const confirmOccurrenceInputSchema = z.object({
  actorUserId: userIdSchema,
  occurrenceId: uuidSchema,
  amount: positiveMoneySchema(),
});

export type ConfirmOccurrenceInput = z.input<typeof confirmOccurrenceInputSchema>;

export const skipOccurrenceInputSchema = z.object({
  actorUserId: userIdSchema,
  occurrenceId: uuidSchema,
  reason: z.string().trim().max(500).optional(),
});

export type SkipOccurrenceInput = z.input<typeof skipOccurrenceInputSchema>;

export type OccurrenceListItem = {
  id: string;
  ruleId: string;
  transactionId: string | null;
  scheduledFor: string;
  status: "pending" | "success" | "failed" | "skipped" | "awaiting_confirmation";
  ruleDescription: string;
  ruleAmount: string;
  ruleCurrency: string;
  ruleType: "income" | "expense" | "transfer";
  ruleAmountMode: "fixed" | "variable";
  ruleAccountId: string | null;
  ruleCategoryId: string | null;
  ruleMerchantId: string | null;
  ruleFrequency: string;
  ruleInterval: number;
};
