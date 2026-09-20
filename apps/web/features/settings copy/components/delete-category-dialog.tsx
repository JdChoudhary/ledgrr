import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { Category } from "@/features/settings/lib/types";

interface DeleteCategoryDialogProps {
  deleteTarget: string | null;
  categories: Category[];
  onOpenChange: (open: boolean) => void;
  onConfirmDelete: (name: string) => void;
}

export function DeleteCategoryDialog({
  deleteTarget,
  categories,
  onOpenChange,
  onConfirmDelete,
}: DeleteCategoryDialogProps) {
  const count =
    categories.find((c) => c.name === deleteTarget)?.transactionCount || 0;
  return (
    <AlertDialog
      open={!!deleteTarget}
      onOpenChange={(open) => !open && onOpenChange(false)}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            Delete &quot;{deleteTarget}&quot;?
          </AlertDialogTitle>
          <AlertDialogDescription>
            This will remove this category from all months.
            {count > 0 && (
              <span className="font-medium text-foreground">
                {" "}
                {count} transaction{count !== 1 ? "s" : ""}
              </span>
            )}{" "}
            will become uncategorized. This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => deleteTarget && onConfirmDelete(deleteTarget)}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
