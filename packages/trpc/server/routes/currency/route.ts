import { z } from "../../schema";
// Writes are admin-only; list is open to any authenticated user so pickers
// (settings, transaction forms) can enumerate currencies.
import {
  adminProcedure,
  authenticatedProcedure,
  router,
} from "../../trpc";
import { generatePath } from "../../utils/path-generator";
import {
  activateCurrency,
  createCurrency,
  deactivateCurrency,
  getCurrency,
  listCurrencies,
  updateCurrency,
} from "@repo/services/currency";

import {
  createCurrencySchema,
  currencyLookupSchema,
  currencyStatusSchema,
  listCurrenciesSchema,
  updateCurrencySchema,
} from "./model";

const TAGS = ["Currencies"] as string[];
const getPath = generatePath("/currencies");

// ---------------------------------------------------------------------------
// Response schemas (for OpenAPI)
// ---------------------------------------------------------------------------

const currencyResponseSchema = z.object({
  code: z.string(),
  name: z.string(),
  symbol: z.string(),
  minorUnits: z.number(),
  isActive: z.boolean(),
});

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

export const currencyRouter = router({
  // -- Queries -------------------------------------------------------------

  get: adminProcedure
    .meta({ openapi: { method: "GET", path: getPath("/{code}"), tags: TAGS } })
    .input(currencyLookupSchema)
    .output(currencyResponseSchema)
    .query(async ({ input }) => {
      const result = await getCurrency({ code: input.code });
      return result;
    }),

  list: authenticatedProcedure
    .meta({ openapi: { method: "GET", path: getPath(""), tags: TAGS } })
    .input(listCurrenciesSchema)
    .output(z.array(currencyResponseSchema))
    .query(async ({ input }) => {
      const results = await listCurrencies({ includeInactive: input.includeInactive });
      return [...results];
    }),

  // -- Admin mutations ------------------------------------------------------

  create: adminProcedure
    .meta({ openapi: { method: "POST", path: getPath(""), tags: TAGS } })
    .input(createCurrencySchema)
    .output(currencyResponseSchema)
    .mutation(async ({ input, ctx }) => {
      const result = await createCurrency({ ...input, actorUserId: ctx.user.id });
      return result;
    }),

  update: adminProcedure
    .meta({ openapi: { method: "PATCH", path: getPath("/{code}"), tags: TAGS } })
    .input(updateCurrencySchema)
    .output(currencyResponseSchema)
    .mutation(async ({ input, ctx }) => {
      const result = await updateCurrency({ ...input, actorUserId: ctx.user.id });
      return result;
    }),

  deactivate: adminProcedure
    .meta({ openapi: { method: "POST", path: getPath("/{code}/deactivate"), tags: TAGS } })
    .input(currencyLookupSchema)
    .output(currencyResponseSchema)
    .mutation(async ({ input, ctx }) => {
      const result = await deactivateCurrency({
        code: input.code,
        isActive: false,
        actorUserId: ctx.user.id,
      });
      return result;
    }),

  activate: adminProcedure
    .meta({ openapi: { method: "POST", path: getPath("/{code}/activate"), tags: TAGS } })
    .input(currencyLookupSchema)
    .output(currencyResponseSchema)
    .mutation(async ({ input, ctx }) => {
      const result = await activateCurrency({
        code: input.code,
        isActive: true,
        actorUserId: ctx.user.id,
      });
      return result;
    }),
});
