"use client";

import * as React from "react";

import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxGroup,
  ComboboxInput,
  ComboboxItem,
  ComboboxLabel,
  ComboboxList,
} from "@/components/ui/combobox";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";

import {
  useCategoryOptions,
  type CategoryOption,
} from "~/hooks/api/category/hierarchy";

/**
 * The one category selector used everywhere (budgets, transactions, filters,
 * analytics). Renders the canonical hierarchy:
 *
 * ```text
 * Needs
 *   Food
 *   Clothes
 * Wants
 *   Entertainment
 * Other          ← ungrouped categories, no "Ungrouped" heading
 * Miscellaneous
 * ```
 *
 * The value is always the `category.id`. Empty-state behavior:
 * - No categories at all → "No categories available"
 * - Categories exist but search misses → "No categories found"
 */
type Props = {
  value: string | null;
  onValueChange: (categoryId: string | null) => void;
  /** Restrict to one category type (e.g. expense for budgets). */
  type?: "income" | "expense";
  label?: string;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
  className?: string;
};

export function CategoryCombobox({
  value,
  onValueChange,
  type,
  label = "Category",
  placeholder = "Select category",
  error,
  disabled,
  className,
}: Props) {
  const [query, setQuery] = React.useState("");

  const { items, data, isPending } = useCategoryOptions(type ? { type } : {});

  const selected = items.find((item) => item.id === value) ?? null;
  const groups = data?.categoryGroups ?? [];
  const ungrouped = data?.ungroupedCategories ?? [];

  // Explicit overall empty state — never a fake category.
  const hasCategories =
    groups.some((group) => group.categories.length > 0) || ungrouped.length > 0;

  const handleSelect = (option: CategoryOption | null) => {
    onValueChange(option?.id ?? null);
    setQuery(option?.name ?? "");
  };

  return (
    <Field data-invalid={!!error} className={className}>
      <FieldLabel>{label}</FieldLabel>
      <Combobox
        items={items}
        value={selected}
        onValueChange={(option) => handleSelect(option as CategoryOption | null)}
        inputValue={query}
        onInputValueChange={setQuery}
        isItemEqualToValue={(item, current) =>
          (item as CategoryOption).id === (current as CategoryOption | null)?.id
        }
      >
        <ComboboxInput
          placeholder={placeholder}
          showClear
          disabled={disabled}
          aria-invalid={!!error}
        />
        <ComboboxContent>
          {!isPending && !hasCategories ? (
            // Database has no selectable categories — distinct from a search miss.
            <ComboboxEmpty>No categories available</ComboboxEmpty>
          ) : (
            <ComboboxEmpty>
              {/* Categories exist but nothing matches the search. */}
              No categories found
            </ComboboxEmpty>
          )}

          <ComboboxList>
            {groups
              .filter((group) => group.categories.length > 0)
              .map((group) => (
                <ComboboxGroup key={group.id}>
                  <ComboboxLabel>{group.name}</ComboboxLabel>
                  {group.categories.map((category) => (
                    <ComboboxItem key={category.id} value={category}>
                      {category.name}
                    </ComboboxItem>
                  ))}
                </ComboboxGroup>
              ))}

            {/* Ungrouped categories render flat — being ungrouped is an
                implementation detail, never a visible heading. */}
            {ungrouped.length > 0 ? (
              <ComboboxGroup>
                {ungrouped.map((category) => (
                  <ComboboxItem key={category.id} value={category}>
                    {category.name}
                  </ComboboxItem>
                ))}
              </ComboboxGroup>
            ) : null}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
      <FieldError errors={error ? [{ message: error }] : []} />
    </Field>
  );
}
