import { z } from "zod";

export const createSplitExpenseSchema = z.object({
  accountId: z.string().min(1, "Account ID is required"),
  categoryId: z.string().nullable().optional(),
  totalAmount: z.union([z.number(), z.string()]),
  title: z.string().min(1, "Title is required").max(200),
  date: z.string().min(1, "Date is required"),
  splitMethod: z.enum(["equal", "percentage", "exact", "shares"]).default("equal"),
  shares: z
    .array(
      z.object({
        userId: z.string().min(1),
        amount: z.union([z.number(), z.string()]),
        isOwner: z.boolean().optional(),
      }),
    )
    .min(1, "At least one share is required"),
});

export const settleShareSchema = z.object({
  shareId: z.string().min(1, "Share ID is required"),
  method: z.enum(["cash", "app_transfer"]),
  accountId: z.string().optional(), // required for app_transfer
});

export type CreateSplitExpenseInput = z.infer<typeof createSplitExpenseSchema>;
export type SettleShareInput = z.infer<typeof settleShareSchema>;
