import { z } from "../../schema";
import { router, authenticatedProcedure } from "../../trpc";
import { generatePath } from "../../utils/path-generator";
import {
  createDebt,
  listDebts,
  getCounterpartyBalance,
  settleDebt,
  cancelDebt,
} from "@repo/services/debt";
import {
  createDebtSchema,
  listDebtsSchema,
  settleDebtSchema,
  cancelDebtSchema,
  counterpartyBalanceSchema,
  debtListItemResponseSchema,
  counterpartyBalanceResponseSchema,
} from "./model";

const TAGS = ["Debts"] as string[];
const getPath = generatePath("/debts");

export const debtRouter = router({
  // -- Obligations (never income / never expense) ---------------------------

  create: authenticatedProcedure
    .meta({ openapi: { method: "POST", path: getPath(""), tags: TAGS } })
    .input(createDebtSchema)
    .output(debtListItemResponseSchema)
    .mutation(async ({ input, ctx }) => {
      const debt = await createDebt({
        ...input,
        actorUserId: ctx.user.id,
      });
      // Derive the same enriched shape as the list for a consistent contract.
      return {
        debt,
        status: "open" as const,
        outstandingAmount: debt.amount,
        creditorName: "",
        debtorName: "",
      } as z.infer<typeof debtListItemResponseSchema>;
    }),

  list: authenticatedProcedure
    .meta({ openapi: { method: "GET", path: getPath(""), tags: TAGS } })
    .input(listDebtsSchema)
    .output(z.array(debtListItemResponseSchema))
    .query(async ({ input, ctx }) => {
      const results = await listDebts({ ...input, actorUserId: ctx.user.id });
      return [...results].map((r) => r as z.infer<typeof debtListItemResponseSchema>);
    }),

  /** Net balance across all debts with one counterparty (derived, not stored). */
  counterpartyBalance: authenticatedProcedure
    .meta({
      openapi: {
        method: "GET",
        path: getPath("/balance/{counterpartyUserId}"),
        tags: TAGS,
      },
    })
    .input(counterpartyBalanceSchema)
    .output(counterpartyBalanceResponseSchema)
    .query(async ({ input, ctx }) => {
      const result = await getCounterpartyBalance({
        actorUserId: ctx.user.id,
        counterpartyUserId: input.counterpartyUserId,
      });
      return result as z.infer<typeof counterpartyBalanceResponseSchema>;
    }),

  // -- Settlement ------------------------------------------------------------

  settle: authenticatedProcedure
    .meta({
      openapi: { method: "POST", path: getPath("/{debtId}/settle"), tags: TAGS },
    })
    .input(settleDebtSchema)
    .output(debtListItemResponseSchema)
    .mutation(async ({ input, ctx }) => {
      const debt = await settleDebt({ ...input, actorUserId: ctx.user.id });
      const outstanding = Math.max(
        0,
        Number(debt.amount) - Number(debt.paidAmount),
      );
      const status =
        debt.cancelledAt != null
          ? ("cancelled" as const)
          : Number(debt.paidAmount) >= Number(debt.amount)
            ? ("settled" as const)
            : Number(debt.paidAmount) > 0
              ? ("partially_settled" as const)
              : ("open" as const);
      return {
        debt,
        status,
        outstandingAmount: outstanding.toFixed(4),
        creditorName: "",
        debtorName: "",
      } as z.infer<typeof debtListItemResponseSchema>;
    }),

  cancel: authenticatedProcedure
    .meta({
      openapi: { method: "POST", path: getPath("/{debtId}/cancel"), tags: TAGS },
    })
    .input(cancelDebtSchema)
    .output(debtListItemResponseSchema)
    .mutation(async ({ input, ctx }) => {
      const debt = await cancelDebt({ ...input, actorUserId: ctx.user.id });
      return {
        debt,
        status: "cancelled" as const,
        outstandingAmount: Math.max(
          0,
          Number(debt.amount) - Number(debt.paidAmount),
        ).toFixed(4),
        creditorName: "",
        debtorName: "",
      } as z.infer<typeof debtListItemResponseSchema>;
    }),
});
