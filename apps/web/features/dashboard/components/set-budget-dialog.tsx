"use client";

import * as React from "react";
import { Loader2Icon, PlusIcon, TagIcon } from "lucide-react";

import { toast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";

import { useSpaces } from "~/hooks/api/space";
import { useCategories, useCreateCategory } from "~/hooks/api/category";
import { useCreateBudget } from "~/hooks/api/budget";

const PERIOD_OPTIONS = [
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "yearly", label: "Yearly" },
] as const;

type PeriodType = (typeof PERIOD_OPTIONS)[number]["value"];

/**
 * Base UI derives labels automatically only for the exact `{ value, label }`
 * shape — extra keys (like `color`) make it stringify the whole object, so
 * colors are resolved through a lookup map instead of living on the item.
 */
interface CategoryOption {
  value: string;
  label: string;
}

const DEFAULT_CATEGORY_COLOR = "#6B7280";

const AMOUNT_PATTERN = /^\d+(\.\d{1,4})?$/;

function today(): string {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 10);
}

const FORM_ID = "set-budget-form";

export function SetBudgetDialog() {
  const [open, setOpen] = React.useState(false);

  const [selected, setSelected] = React.useState<CategoryOption | null>(null);
  const [query, setQuery] = React.useState("");
  const [amount, setAmount] = React.useState("");
  const [periodType, setPeriodType] = React.useState<PeriodType>("monthly");
  const [startsOn, setStartsOn] = React.useState(today);
  const [errors, setErrors] = React.useState<{
    category?: string;
    amount?: string;
  }>({});

  const spaces = useSpaces(open ? {} : undefined);
  const space = spaces.spaces?.[0]?.space;
  const spaceId = space?.id;

  const categories = useCategories(
    spaceId ? { spaceId, type: "expense" } : undefined,
  );

  const items = React.useMemo<CategoryOption[]>(
    () =>
      (categories.categories ?? []).map((category) => ({
        value: category.id,
        label: category.name,
      })),
    [categories.categories],
  );

  const colorById = React.useMemo(() => {
    const map = new Map<string, string>();
    for (const category of categories.categories ?? []) {
      map.set(category.id, category.color);
    }
    return map;
  }, [categories.categories]);

  const trimmedQuery = query.trim();
  const exactMatch = React.useMemo(
    () =>
      items.some(
        (item) => item.label.toLowerCase() === trimmedQuery.toLowerCase(),
      ),
    [items, trimmedQuery],
  );

  const canCreate =
    trimmedQuery.length > 0 && !exactMatch && !categories.isFetching && !!spaceId;

  const { createCategory, isPending: createCategoryPending } = useCreateCategory({
    onSuccess: async (created) => {
      setSelected({ value: created.id, label: created.name });
      setQuery("");
      setErrors((prev) => ({ ...prev, category: undefined }));
      toast.success(`Category "${created.name}" created`);
    },
    onError: (error) =>
      toast.error("Couldn't create category", error.message),
  });

  const { createBudget, isPending: createBudgetPending } = useCreateBudget({
    onSuccess: async () => {
      toast.success("Budget set");
      setOpen(false);
    },
    onError: (error) => toast.error("Couldn't set budget", error.message),
  });

  const reset = () => {
    setSelected(null);
    setQuery("");
    setAmount("");
    setPeriodType("monthly");
    setStartsOn(today());
    setErrors({});
  };

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) reset();
  };

  const handleCreateCategory = () => {
    if (!spaceId || !canCreate) return;
    createCategory({ spaceId, name: trimmedQuery, type: "expense" });
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const next: typeof errors = {};
    if (!selected) next.category = "Choose or create a category.";
    if (!AMOUNT_PATTERN.test(amount.trim()) || Number(amount) <= 0) {
      next.amount = "Enter an amount greater than 0.";
    }
    setErrors(next);

    if (!selected || !spaceId || Object.keys(next).length > 0) return;

    createBudget({
      spaceId,
      categoryId: selected.value,
      periodType,
      startsOn,
      limitAmount: amount.trim(),
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button size="sm" />}>
        <PlusIcon />
        Set Budget
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Set a budget</DialogTitle>
          <DialogDescription>
            Pick a category and set a spending limit for the period.
          </DialogDescription>
        </DialogHeader>

        <form
          id={FORM_ID}
          onSubmit={handleSubmit}
          className="flex flex-col gap-4"
        >
          <Field data-invalid={!!errors.category}>
            <FieldLabel>Category</FieldLabel>
            <Combobox
              items={items}
              value={selected}
              onValueChange={(value) => {
                setSelected(value);
                if (value) {
                  setErrors((prev) => ({ ...prev, category: undefined }));
                }
              }}
              inputValue={query}
              onInputValueChange={setQuery}
              isItemEqualToValue={(item, value) => item.value === value.value}
            >
              <ComboboxInput
                placeholder="Search or create a category..."
                showClear
                onKeyDown={(event) => {
                  if (event.key !== "Enter") return;
                  // Enter creates the typed name when nothing matches;
                  // otherwise Base UI handles item selection natively.
                  if (!selected && canCreate) {
                    event.preventDefault();
                    event.stopPropagation();
                    handleCreateCategory();
                    return;
                  }
                  if (!selected) event.preventDefault();
                }}
              />
              <ComboboxContent>
                <ComboboxEmpty>
                  <button
                    type="button"
            disabled={!canCreate || createCategoryPending}
            onClick={handleCreateCategory}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-accent disabled:pointer-events-none disabled:opacity-50"
                  >
                    {createCategoryPending ? (
                      <Loader2Icon className="animate-spin" />
                    ) : (
                      <PlusIcon />
                    )}
                    {trimmedQuery ? (
                      <>
                        Create <span className="font-medium">{trimmedQuery}</span>
                      </>
                    ) : (
                      "No categories yet"
                    )}
                  </button>
                </ComboboxEmpty>
                <ComboboxList>
                  {(option: CategoryOption) => (
                    <ComboboxItem key={option.value} value={option}>
                      <TagIcon
                        style={{ color: colorById.get(option.value) ?? DEFAULT_CATEGORY_COLOR }}
                      />
                      {option.label}
                    </ComboboxItem>
                  )}
                </ComboboxList>
              </ComboboxContent>
            </Combobox>
            <FieldError
              errors={errors.category ? [{ message: errors.category }] : []}
            />
          </Field>

          <Field data-invalid={!!errors.amount}>
            <FieldLabel>Limit amount</FieldLabel>
            <InputGroup>
              <InputGroupAddon align="inline-start">
                {space?.baseCurrency ?? "USD"}
              </InputGroupAddon>
              <InputGroupInput
                inputMode="decimal"
                placeholder="0.00"
                value={amount}
                aria-invalid={!!errors.amount}
                onChange={(event) => {
                  setAmount(event.target.value);
                  if (errors.amount) {
                    setErrors((prev) => ({ ...prev, amount: undefined }));
                  }
                }}
              />
            </InputGroup>
            <FieldError
              errors={errors.amount ? [{ message: errors.amount }] : []}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field>
              <FieldLabel>Period</FieldLabel>
              {/* `items` lets <SelectValue/> render labels instead of raw values. */}
              <Select
                items={PERIOD_OPTIONS}
                value={periodType}
                onValueChange={(value) => {
                  if (value) setPeriodType(value as PeriodType);
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PERIOD_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field>
              <FieldLabel>Starts on</FieldLabel>
              <Input
                type="date"
                value={startsOn}
                onChange={(event) => setStartsOn(event.target.value)}
              />
            </Field>
          </div>
        </form>

        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
          <Button
            type="submit"
            form={FORM_ID}
            disabled={createBudgetPending || !spaceId}
          >
            {createBudgetPending && (
              <Loader2Icon className="animate-spin" />
            )}
            Set budget
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
