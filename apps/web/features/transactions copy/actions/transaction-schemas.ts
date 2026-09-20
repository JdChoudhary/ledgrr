import { z } from "zod";

export const createTransactionSchema = z
  .object({
    accountId: z.string().min(1, "Source account is required"),
    toAccountId: z.string().nullable().optional(),
    categoryId: z.string().nullable().optional(),
    type: z.enum([
      "income",
      "expense",
      "transfer",
      "debt_borrow",
      "debt_lend",
      "debt_collect",
      "debt_payback",
      "refund",
    ]),
    amount: z.union([z.number(), z.string()]),
    description: z.string().max(500).optional(),
    date: z.string().min(1, "Date is required"),
    currency: z.string().min(3).max(3).optional(),
    notes: z.string().nullable().optional(),
    personalAmount: z.union([z.number(), z.string()]).nullable().optional(),
    refundOfTransactionId: z.string().nullable().optional(),
    debtId: z.string().nullable().optional(),
    billSplitId: z.string().nullable().optional(),
    goalId: z.string().nullable().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.type === "transfer" && !data.toAccountId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "toAccountId is required for transfers",
        path: ["toAccountId"],
      });
    }
    if (data.type === "transfer" && data.accountId === data.toAccountId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Source and destination accounts must differ",
        path: ["toAccountId"],
      });
    }
    if (data.type === "refund" && !data.refundOfTransactionId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "refundOfTransactionId is required for refunds",
        path: ["refundOfTransactionId"],
      });
    }
  });

export const updateTransactionSchema = z.object({
  accountId: z.string().min(1).optional(),
  toAccountId: z.string().nullable().optional(),
  categoryId: z.string().nullable().optional(),
  type: z
    .enum([
      "income",
      "expense",
      "transfer",
      "debt_borrow",
      "debt_lend",
      "debt_collect",
      "debt_payback",
      "refund",
    ])
    .optional(),
  amount: z.union([z.number(), z.string()]).optional(),
  description: z.string().min(1).max(500).optional(),
  date: z.string().optional(),
  notes: z.string().nullable().optional(),
  status: z.enum(["pending", "posted", "cleared", "cancelled"]).optional(),
});

export const listTransactionsSchema = z.object({
  accountId: z.string().optional(),
  categoryId: z.string().optional(),
  type: z.array(z.string()).optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  search: z.string().optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;
export type UpdateTransactionInput = z.infer<typeof updateTransactionSchema>;
export type ListTransactionsInput = z.infer<typeof listTransactionsSchema>;
