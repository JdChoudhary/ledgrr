import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GripVertical, Pencil, Trash2, Check, X, ArrowUp, ArrowDown } from "lucide-react";
import type { Category } from "@/features/settings/lib/types";

interface CategoryListProps {
  categories: Category[];
  label: string;
  color: string;
  renamingId: string | null;
  renameValue: string;
  onRenameValueChange: (value: string) => void;
  onStartRename: (category: Category) => void;
  onCancelRename: () => void;
  onConfirmRename: (oldName: string) => void;
  onMoveCategory: (
    list: Category[],
    index: number,
    direction: "up" | "down",
  ) => void;
  onDeleteCategory: (name: string) => void;
  fmt: (amount: number) => string;
}

export function CategoryList({
  categories,
  label,
  color,
  renamingId,
  renameValue,
  onRenameValueChange,
  onStartRename,
  onCancelRename,
  onConfirmRename,
  onMoveCategory,
  onDeleteCategory,
  fmt,
}: CategoryListProps) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
        {label}
      </p>
      {categories.length === 0 ? (
        <p className="text-sm text-muted-foreground py-2">No categories</p>
      ) : (
        <div className="space-y-1">
          {categories.map((cat, i) => {
            const isRenaming = renamingId === cat.id;
            return (
              <div
                key={cat.id}
                className="flex items-center gap-2 group rounded-lg border border-border/50 bg-background px-3 py-2"
              >
                <GripVertical className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />
                <div
                  className="h-2 w-2 rounded-full shrink-0"
                  style={{ backgroundColor: color }}
                />

                {isRenaming ? (
                  <>
                    <Input
                      value={renameValue}
                      onChange={(e) => onRenameValueChange(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") onConfirmRename(cat.name);
                        if (e.key === "Escape") onCancelRename();
                      }}
                      className="h-7 text-sm flex-1"
                      autoFocus
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-emerald-500"
                      onClick={() => onConfirmRename(cat.name)}
                    >
                      <Check className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={onCancelRename}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </>
                ) : (
                  <>
                    <span className="text-sm flex-1 truncate">{cat.name}</span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {cat.transactionCount != null &&
                        cat.transactionCount > 0 && (
                          <span className="text-[10px] font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
                            {cat.transactionCount} tx
                            {cat.transactionCount !== 1 ? "s" : ""}
                          </span>
                        )}
                      {cat.type === "expense" &&
                        cat.totalBudgetLimit != null &&
                        cat.totalBudgetLimit > 0 && (
                          <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded-full">
                            {fmt(cat.totalBudgetSpend || 0)} /{" "}
                            {fmt(cat.totalBudgetLimit)}
                          </span>
                        )}
                      {cat.type === "expense" && (cat.totalSpend || 0) > 0 && (
                        <span className="text-[10px] font-medium text-red-600 dark:text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded-full">
                          spent {fmt(cat.totalSpend || 0)}
                        </span>
                      )}
                      {cat.type === "income" && (cat.totalIncome || 0) > 0 && (
                        <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-full">
                          earned {fmt(cat.totalIncome || 0)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        disabled={i === 0}
                        onClick={() => onMoveCategory(categories, i, "up")}
                      >
                        <ArrowUp className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        disabled={i === categories.length - 1}
                        onClick={() => onMoveCategory(categories, i, "down")}
                      >
                        <ArrowDown className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => onStartRename(cat)}
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                        onClick={() => onDeleteCategory(cat.name)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
