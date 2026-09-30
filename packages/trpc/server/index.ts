import { router } from "./trpc";

import { healthRouter } from "./routes/health/route";
import { categoryGroupRouter } from "./routes/category-group/route";
import { categoryRouter } from "./routes/category/route";
import { accountRouter } from "./routes/account/route";
import { budgetRouter } from "./routes/budget/route";
import { userSettingsRouter } from "./routes/user-settings/route";
import { goalRouter } from "./routes/goal/route";
import { tagRouter } from "./routes/tag/route";
import { friendshipRouter } from "./routes/friendship/route";
import { currencyRouter } from "./routes/currency/route";
import { transactionRouter } from "./routes/transaction/route";
import { debtRouter } from "./routes/debt/route";
import { contactsRouter } from "./routes/contacts/route";
import { householdRouter } from "./routes/household/route";
import { recurringRouter } from "./routes/recurring/route";
import { profileRouter } from "./routes/profile/route";
import { analyticsRouter } from "./routes/analytics/route";
import { dashboardRouter } from "./routes/dashboard/route";

export const serverRouter = router({
  health: healthRouter,
  categoryGroup: categoryGroupRouter,
  category: categoryRouter,
  account: accountRouter,
  budget: budgetRouter,
  userSettings: userSettingsRouter,
  goal: goalRouter,
  tag: tagRouter,
  friend: friendshipRouter,
  contacts: contactsRouter,
  household: householdRouter,
  currency: currencyRouter,
  transaction: transactionRouter,
  debt: debtRouter,
  recurring: recurringRouter,
  profile: profileRouter,
  analytics: analyticsRouter,
  dashboard: dashboardRouter,
});

export { createContext } from "./context";
export type ServerRouter = typeof serverRouter;
