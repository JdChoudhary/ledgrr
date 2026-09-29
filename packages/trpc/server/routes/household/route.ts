import { z } from "../../schema";
import { router, authenticatedProcedure } from "../../trpc";
import { generatePath } from "../../utils/path-generator";
import {
  addHouseholdMember,
  archiveHouseholdCategory,
  createHousehold,
  createHouseholdBudget,
  createHouseholdCategory,
  getHousehold,
  householdBudgetStatus,
  linkHouseholdCategory,
  listHouseholdBudgets,
  listHouseholdCategories,
  listHouseholdCategoryLinks,
  listHouseholdCategorySpend,
  listHouseholds,
  removeHouseholdMember,
  unarchiveHouseholdCategory,
  unlinkHouseholdCategory,
} from "@repo/services/household";

import {
  createHouseholdBudgetSchema,
  createHouseholdCategorySchema,
  createHouseholdSchema,
  householdBudgetLookupSchema,
  householdBudgetResponseSchema,
  householdBudgetStatusSchema,
  householdCategoryLinkDetailSchema,
  householdCategoryLinkResponseSchema,
  householdCategoryLookupSchema,
  householdCategoryResponseSchema,
  householdCategorySpendSchema,
  householdDetailSchema,
  householdLookupSchema,
  householdMemberResponseSchema,
  householdMemberSchema,
  householdResponseSchema,
  householdSummarySchema,
  linkHouseholdCategorySchema,
  listHouseholdBudgetsSchema,
  listHouseholdCategoriesSchema,
  unlinkHouseholdCategorySchema,
} from "./model";

const TAGS = ["Households"] as string[];
const getPath = generatePath("/households");

export const householdRouter = router({
  // -- Households --------------------------------------------------------------

  create: authenticatedProcedure
    .meta({ openapi: { method: "POST", path: getPath(""), tags: TAGS } })
    .input(createHouseholdSchema)
    .output(householdResponseSchema)
    .mutation(async ({ input, ctx }) => {
      return createHousehold({ ...input, actorUserId: ctx.user.id });
    }),

  list: authenticatedProcedure
    .meta({ openapi: { method: "GET", path: getPath(""), tags: TAGS } })
    .input(z.void())
    .output(z.array(householdSummarySchema))
    .query(async ({ ctx }) => {
      return listHouseholds({ actorUserId: ctx.user.id });
    }),

  get: authenticatedProcedure
    .meta({ openapi: { method: "GET", path: getPath("/{householdId}"), tags: TAGS } })
    .input(householdLookupSchema)
    .output(householdDetailSchema)
    .query(async ({ input, ctx }) => {
      return getHousehold({ ...input, actorUserId: ctx.user.id });
    }),

  // -- Membership --------------------------------------------------------------

  addMember: authenticatedProcedure
    .meta({
      openapi: { method: "POST", path: getPath("/{householdId}/members"), tags: TAGS },
    })
    .input(householdMemberSchema)
    .output(householdMemberResponseSchema)
    .mutation(async ({ input, ctx }) => {
      return addHouseholdMember({ ...input, actorUserId: ctx.user.id });
    }),

  removeMember: authenticatedProcedure
    .meta({
      openapi: {
        method: "DELETE",
        path: getPath("/{householdId}/members/{userId}"),
        tags: TAGS,
      },
    })
    .input(householdMemberSchema)
    .output(householdMemberResponseSchema)
    .mutation(async ({ input, ctx }) => {
      return removeHouseholdMember({ ...input, actorUserId: ctx.user.id });
    }),

  // -- Shared categories -------------------------------------------------------

  createCategory: authenticatedProcedure
    .meta({
      openapi: { method: "POST", path: getPath("/{householdId}/categories"), tags: TAGS },
    })
    .input(createHouseholdCategorySchema)
    .output(householdCategoryResponseSchema)
    .mutation(async ({ input, ctx }) => {
      return createHouseholdCategory({ ...input, actorUserId: ctx.user.id });
    }),

  listCategories: authenticatedProcedure
    .meta({
      openapi: { method: "GET", path: getPath("/{householdId}/categories"), tags: TAGS },
    })
    .input(listHouseholdCategoriesSchema)
    .output(z.array(householdCategoryResponseSchema))
    .query(async ({ input, ctx }) => {
      const rows = await listHouseholdCategories({ ...input, actorUserId: ctx.user.id });
      return [...rows];
    }),

  archiveCategory: authenticatedProcedure
    .meta({
      openapi: {
        method: "POST",
        path: getPath("/categories/{householdCategoryId}/archive"),
        tags: TAGS,
      },
    })
    .input(householdCategoryLookupSchema)
    .output(householdCategoryResponseSchema)
    .mutation(async ({ input, ctx }) => {
      return archiveHouseholdCategory({ ...input, actorUserId: ctx.user.id });
    }),

  unarchiveCategory: authenticatedProcedure
    .meta({
      openapi: {
        method: "POST",
        path: getPath("/categories/{householdCategoryId}/unarchive"),
        tags: TAGS,
      },
    })
    .input(householdCategoryLookupSchema)
    .output(householdCategoryResponseSchema)
    .mutation(async ({ input, ctx }) => {
      return unarchiveHouseholdCategory({ ...input, actorUserId: ctx.user.id });
    }),

  // -- Category links ----------------------------------------------------------

  linkCategory: authenticatedProcedure
    .meta({ openapi: { method: "POST", path: getPath("/category-links"), tags: TAGS } })
    .input(linkHouseholdCategorySchema)
    .output(householdCategoryLinkResponseSchema)
    .mutation(async ({ input, ctx }) => {
      return linkHouseholdCategory({ ...input, actorUserId: ctx.user.id });
    }),

  unlinkCategory: authenticatedProcedure
    .meta({
      openapi: { method: "DELETE", path: getPath("/category-links/{linkId}"), tags: TAGS },
    })
    .input(unlinkHouseholdCategorySchema)
    .output(householdCategoryLinkResponseSchema)
    .mutation(async ({ input, ctx }) => {
      return unlinkHouseholdCategory({ ...input, actorUserId: ctx.user.id });
    }),

  listLinks: authenticatedProcedure
    .meta({
      openapi: { method: "GET", path: getPath("/{householdId}/category-links"), tags: TAGS },
    })
    .input(householdLookupSchema)
    .output(z.array(householdCategoryLinkDetailSchema))
    .query(async ({ input, ctx }) => {
      return listHouseholdCategoryLinks({ ...input, actorUserId: ctx.user.id });
    }),

  categorySpend: authenticatedProcedure
    .meta({
      openapi: { method: "GET", path: getPath("/{householdId}/category-spend"), tags: TAGS },
    })
    .input(householdLookupSchema)
    .output(z.array(householdCategorySpendSchema))
    .query(async ({ input, ctx }) => {
      const rows = await listHouseholdCategorySpend({ ...input, actorUserId: ctx.user.id });
      return [...rows];
    }),

  // -- Shared budgets ----------------------------------------------------------

  createBudget: authenticatedProcedure
    .meta({
      openapi: { method: "POST", path: getPath("/budgets"), tags: TAGS },
    })
    .input(createHouseholdBudgetSchema)
    .output(householdBudgetResponseSchema)
    .mutation(async ({ input, ctx }) => {
      return createHouseholdBudget({ ...input, actorUserId: ctx.user.id });
    }),

  listBudgets: authenticatedProcedure
    .meta({
      openapi: { method: "GET", path: getPath("/{householdId}/budgets"), tags: TAGS },
    })
    .input(listHouseholdBudgetsSchema)
    .output(z.array(householdBudgetResponseSchema))
    .query(async ({ input, ctx }) => {
      const rows = await listHouseholdBudgets({ ...input, actorUserId: ctx.user.id });
      return [...rows];
    }),

  budgetStatus: authenticatedProcedure
    .meta({
      openapi: {
        method: "GET",
        path: getPath("/budgets/{householdBudgetId}/status"),
        tags: TAGS,
      },
    })
    .input(householdBudgetLookupSchema)
    .output(householdBudgetStatusSchema)
    .query(async ({ input, ctx }) => {
      return householdBudgetStatus({ ...input, actorUserId: ctx.user.id });
    }),
});
