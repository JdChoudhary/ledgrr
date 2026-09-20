import { z } from "zod";

export const createTransactionSchema = z.object({
  amount: z.union([z.number(), z.string()]).refine((val) => {
    const n = typeof val === "string" ? parseFloat(val.replace(/[^0-9.\-]/g, "")) : val;
    return !isNaN(n) && isFinite(n) && n > 0;
  }, "Amount must be a positive number"),
  date: z.string(),
  description: z.string().min(1, "Description is required").max(500),
  category: z.string().optional().default(""),
  type: z.enum(["income", "expense", "transfer", "refund"]).default("expense"),
  accountId: z.string().optional(),
  toAccountId: z.string().optional(),
});

export const updateTransactionSchema = z.object({
  amount: z.union([z.number(), z.string()]).refine((val) => {
    const n = typeof val === "string" ? parseFloat(val.replace(/[^0-9.\-]/g, "")) : val;
    return !isNaN(n) && isFinite(n) && n > 0;
  }, "Amount must be a positive number"),
  date: z.string(),
  description: z.string().min(1, "Description is required").max(500),
  category: z.string().optional().default(""),
  type: z.enum(["income", "expense", "transfer", "refund"]).default("expense"),
  accountId: z.string().optional(),
  toAccountId: z.string().optional(),
});

export const transferSplitsSchema = z.object({
  transactionId: z.string().min(1),
  splits: z.array(z.object({
    categoryId: z.string().min(1),
    amount: z.union([z.number(), z.string()]),
    note: z.string().optional(),
  })).min(1, "At least one split is required"),
});

export const transactionTagsSchema = z.object({
  transactionId: z.string().min(1),
  tagIds: z.array(z.string()).min(1, "At least one tag is required"),
});

export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;
export type UpdateTransactionInput = z.infer<typeof updateTransactionSchema>;
