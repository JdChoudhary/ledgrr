import { ArrowLeftRight, CircleDollarSign, HandCoins, Plus, Wallet } from "lucide-react";

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import Link from "next/link";

export function QuickActionsTrigger() {
  return (
    <Sheet>
      <SheetTrigger
        render={
          <button className="flex flex-col items-center justify-center gap-1">
            <div className="flex size-9 items-center justify-center rounded-full bg-foreground text-background">
              <Plus className="size-5" />
            </div>

            <span className="text-[11px] font-medium">Add</span>
          </button>
        }
      ></SheetTrigger>

      <SheetContent side="bottom" className="rounded-t-2xl">
        <SheetHeader>
          <SheetTitle>Quick action</SheetTitle>
        </SheetHeader>

        <div className="grid grid-cols-2 gap-3 py-5">
          <QuickAction
            icon={CircleDollarSign}
            label="Expense"
            href="/dashboard/transactions/new?type=expense"
          />

          <QuickAction
            icon={Wallet}
            label="Income"
            href="/dashboard/transactions/new?type=income"
          />

          <QuickAction
            icon={ArrowLeftRight}
            label="Transfer"
            href="/dashboard/transactions/new?type=transfer"
          />

          <QuickAction
            icon={HandCoins}
            label="Split expense"
            href="/dashboard/together/splits/new"
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
export function QuickAction({
  icon: Icon,
  label,
  href,
}: {
  icon: React.ElementType;
  label: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-xl border p-4 transition-colors hover:bg-muted"
    >
      <Icon className="size-5" />
      <span className="text-sm font-medium">{label}</span>
    </Link>
  );
}
