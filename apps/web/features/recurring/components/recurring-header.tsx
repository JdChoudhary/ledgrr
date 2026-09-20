import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

interface RecurringHeaderProps {
  activeCount: number;
  onAddRule: () => void;
}

export function RecurringHeader({ activeCount, onAddRule }: RecurringHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-lg font-semibold">Recurring Transactions</h1>
        <p className="text-sm text-muted-foreground">
          {activeCount} active rule{activeCount !== 1 ? "s" : ""}
        </p>
      </div>
      <Button
        size="sm"
        className="h-8 gap-1.5"
        onClick={onAddRule}
      >
        <Plus className="h-3.5 w-3.5" />
        Add rule
      </Button>
    </div>
  );
}
