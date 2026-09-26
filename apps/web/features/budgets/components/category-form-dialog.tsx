"use client";

import * as React from "react";
import { Loader2Icon } from "lucide-react";

import { cn } from "cn";
import { toast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCreateCategory } from "~/hooks/api/category";

import {
  CATEGORY_COLORS,
  CATEGORY_ICONS,
  DEFAULT_CATEGORY_COLOR,
  DEFAULT_CATEGORY_ICON_KEY,
  getCategoryIcon,
} from "../lib/category-icons";

const NO_GROUP = "__none__";

type CategoryFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  spaceId: string | undefined;
  /** Groups the category can be filed under. */
  groups: { id: string; name: string }[];
  /** Pre-selected group — the section the dialog was opened from. */
  defaultGroupId?: string | null;
  /** `sortOrder` to give the new row (usually the current category count). */
  nextSortOrder: number;
  /** Bumped by the caller on every open, so the form starts blank each time. */
  formNonce: number;
  /** Runs after a successful create; the caller refreshes its queries. */
  onCreated?: () => void | Promise<void>;
};

/**
 * Create-category form covering every field the category service accepts:
 * name, type, colour, icon, and group. Opened from the category manager (the
 * sheet and each group section pre-fill their own group).
 *
 * The body is keyed on `formNonce`, so each open starts from a clean draft
 * without resetting state from an effect.
 */
export function CategoryFormDialog({
  open,
  onOpenChange,
  formNonce,
  ...body
}: CategoryFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <CategoryFormBody key={formNonce} onOpenChange={onOpenChange} {...body} />
      </DialogContent>
    </Dialog>
  );
}

function CategoryFormBody({
  onOpenChange,
  spaceId,
  groups,
  defaultGroupId = null,
  nextSortOrder,
  onCreated,
}: Omit<CategoryFormDialogProps, "open" | "formNonce">) {
  const { createCategoryAsync, isPending } = useCreateCategory();

  const [name, setName] = React.useState("");
  const [type, setType] = React.useState<"expense" | "income">("expense");
  const [color, setColor] = React.useState<string>(DEFAULT_CATEGORY_COLOR);
  const [icon, setIcon] = React.useState<string>(DEFAULT_CATEGORY_ICON_KEY);
  const [groupId, setGroupId] = React.useState<string>(defaultGroupId ?? NO_GROUP);
  const [error, setError] = React.useState<string | null>(null);

  const groupOptions = [
    { value: NO_GROUP, label: "No group" },
    ...groups.map((group) => ({ value: group.id, label: group.name })),
  ];

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (!spaceId) {
      setError("No active space.");
      return;
    }
    if (!trimmed) {
      setError("Give the category a name.");
      return;
    }
    setError(null);

    try {
      await createCategoryAsync({
        spaceId,
        name: trimmed,
        type,
        color,
        icon,
        sortOrder: nextSortOrder,
        ...(groupId === NO_GROUP ? {} : { groupId }),
      });
      await onCreated?.();
      toast.success(`"${trimmed}" created`);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't create the category");
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          {/* The chosen icon previews in the chosen colour. Built with
              createElement because the icon is a runtime lookup. */}
          {React.createElement(getCategoryIcon(icon), {
            className: "size-4 shrink-0",
            style: { color },
          })}
          New category
        </DialogTitle>
        <DialogDescription>
          Name it, choose whether it tracks spending or income, then give it a colour,
          an icon, and a group.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4 py-4">
        {/* Name + type */}
        <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
          <Field>
            <FieldLabel htmlFor="category-name">Name</FieldLabel>
            <Input
              id="category-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Groceries"
              autoFocus
              aria-invalid={error !== null}
            />
          </Field>

          <Field className="sm:w-44">
            <FieldLabel>Type</FieldLabel>
            <div className="flex rounded-lg border p-0.5">
              {(["expense", "income"] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setType(option)}
                  aria-pressed={type === option}
                  className={cn(
                    "flex-1 rounded-md px-2 py-1 text-xs font-medium transition-colors",
                    type === option
                      ? option === "expense"
                        ? "bg-rose-500/15 text-rose-700 dark:text-rose-400"
                        : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                      : "text-muted-foreground hover:bg-muted",
                  )}
                >
                  {option === "expense" ? "Expense" : "Income"}
                </button>
              ))}
            </div>
          </Field>
        </div>

        {/* Colour */}
        <Field>
          <FieldLabel>Colour</FieldLabel>
          <div className="flex flex-wrap items-center gap-1.5">
            {CATEGORY_COLORS.map((swatch) => (
              <button
                key={swatch}
                type="button"
                onClick={() => setColor(swatch)}
                aria-label={`Use ${swatch}`}
                aria-pressed={color.toUpperCase() === swatch}
                className={cn(
                  "size-6 rounded-full ring-offset-2 ring-offset-background transition-all",
                  color.toUpperCase() === swatch
                    ? "ring-2 ring-foreground"
                    : "ring-1 ring-border hover:scale-110",
                )}
                style={{ backgroundColor: swatch }}
              />
            ))}
            <label
              className="ml-1 flex h-7 cursor-pointer items-center gap-1.5 rounded-lg border px-2 text-[11px] text-muted-foreground transition-colors hover:bg-muted"
              title="Custom colour"
            >
              <span
                className="size-3.5 rounded-full ring-1 ring-border"
                style={{ backgroundColor: color }}
              />
              Custom
              <input
                type="color"
                value={color}
                onChange={(event) => setColor(event.target.value.toUpperCase())}
                aria-label="Custom colour"
                className="sr-only"
              />
            </label>
          </div>
        </Field>

        {/* Icon */}
        <Field>
          <FieldLabel>Icon</FieldLabel>
          <div className="grid max-h-40 grid-cols-8 gap-1 overflow-y-auto rounded-lg border p-1.5 sm:grid-cols-11">
            {CATEGORY_ICONS.map(({ key, label, Icon }) => (
              <button
                key={key}
                type="button"
                onClick={() => setIcon(key)}
                title={label}
                aria-label={label}
                aria-pressed={icon === key}
                className={cn(
                  "flex size-7 items-center justify-center rounded-md transition-colors",
                  icon === key
                    ? "bg-muted text-foreground ring-1 ring-foreground/20"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <Icon className="size-3.5" />
              </button>
            ))}
          </div>
        </Field>

        {/* Group */}
        <Field>
          <FieldLabel>Group</FieldLabel>
          <Select
            items={groupOptions}
            value={groupId}
            onValueChange={(value) => {
              if (value) setGroupId(String(value));
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {groupOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldDescription>
            Groups keep related categories together on the budgets page.
          </FieldDescription>
        </Field>

        <FieldError>{error}</FieldError>
      </div>

      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          onClick={() => onOpenChange(false)}
          disabled={isPending}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isPending || !name.trim()}>
          {isPending ? <Loader2Icon className="size-3.5 animate-spin" /> : null}
          Create category
        </Button>
      </DialogFooter>
    </form>
  );
}
