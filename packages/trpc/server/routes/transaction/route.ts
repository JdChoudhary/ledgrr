import { z } from "../../schema";
import { router, authenticatedProcedure } from "../../trpc";
import { generatePath } from "../../utils/path-generator";
import {
  createTransaction,
  deleteTransaction,
  getTransaction,
  listTransactions,
  previewSplit,
} from "@repo/services/transaction";
import {
  createTransactionSchema,
  deleteTransactionSchema,
  transactionLookupSchema,
  listTransactionsSchema,
  splitPreviewSchema,
  transactionResponseSchema,
  splitShareResponseSchema,
} from "./model";

const TAGS = ["Transactions"] as string[];
const getPath = generatePath("/transactions");

export const transactionRouter = router({
  // -- Financial source of truth -------------------------------------------

  create: authenticatedProcedure
    .meta({ openapi: { method: "POST", path: getPath(""), tags: TAGS } })
    .input(createTransactionSchema)
    .output(transactionResponseSchema)
    .mutation(async ({ input, ctx }) => {
      const result = await createTransaction({
        ...input,
        actorUserId: ctx.user.id,
      });
      return result as z.infer<typeof transactionResponseSchema>;
    }),

  get: authenticatedProcedure
    .meta({
      openapi: { method: "GET", path: getPath("/{transactionId}"), tags: TAGS },
    })
    .input(transactionLookupSchema)
    .output(transactionResponseSchema)
    .query(async ({ input, ctx }) => {
      const result = await getTransaction({
        ...input,
        actorUserId: ctx.user.id,
      });
      return result as z.infer<typeof transactionResponseSchema>;
    }),

  list: authenticatedProcedure
    .meta({ openapi: { method: "GET", path: getPath(""), tags: TAGS } })
    .input(listTransactionsSchema)
    .output(z.array(transactionResponseSchema))
    .query(async ({ input, ctx }) => {
      const results = await listTransactions({
        ...input,
        actorUserId: ctx.user.id,
      });
      return [...results].map((r) => r as z.infer<typeof transactionResponseSchema>);
    }),

  delete: authenticatedProcedure
    .meta({
      openapi: { method: "DELETE", path: getPath("/{transactionId}"), tags: TAGS },
    })
    .input(deleteTransactionSchema)
    .output(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      return deleteTransaction({
        ...input,
        actorUserId: ctx.user.id,
      });
    }),

  // -- Pure split preview (no persistence) ---------------------------------

  previewSplit: authenticatedProcedure
    .meta({
      openapi: { method: "POST", path: getPath("/split-preview"), tags: TAGS },
    })
    .input(splitPreviewSchema)
    .output(z.array(splitShareResponseSchema))
    .query(async ({ input }) => {
      const shares = await previewSplit(input);
      return shares.map(
        (s) => s as z.infer<typeof splitShareResponseSchema>,
      );
    }),
});
