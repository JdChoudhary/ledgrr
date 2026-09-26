import { MONTHLY_EXPENSES_DESCRIPTION } from "@/features/monthly-expenses/lib/constants";

export function MonthlyExpensesHeader() {
  return (
    <div>
      <p className="text-sm text-muted-foreground">
        {MONTHLY_EXPENSES_DESCRIPTION}
      </p>
    </div>
  );
}
