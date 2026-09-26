"use client";

import * as React from "react";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "cn";

interface Merchant {
  id: string;
  name: string;
  categoryId?: string | null;
  categoryName?: string | null;
}

interface AddRecurringComboboxProps {
  merchants: Merchant[];
  onSelect: (merchant: Merchant) => void;
  onCreateNew: () => void;
  className?: string;
}

export function AddRecurringCombobox({
  merchants,
  onSelect,
  onCreateNew,
  className,
}: AddRecurringComboboxProps) {
  const [open, setOpen] = React.useState(false);

  // Group merchants by first letter
  const grouped = React.useMemo(() => {
    const groups: Record<string, Merchant[]> = {};
    for (const m of merchants) {
      const letter = m.name[0]?.toUpperCase() ?? "#";
      if (!groups[letter]) groups[letter] = [];
      groups[letter].push(m);
    }
    return groups;
  }, [merchants]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between rounded-xl", className)}
        >
          Select merchant...
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0 rounded-xl" align="start">
        <Command>
          <CommandInput placeholder="Search merchants..." className="h-9" />
          <CommandList>
            <CommandEmpty>
              <div className="flex flex-col items-center gap-2 py-4">
                <p className="text-sm text-muted-foreground">No merchant found</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl gap-1.5"
                  onClick={() => {
                    setOpen(false);
                    onCreateNew();
                  }}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Create new
                </Button>
              </div>
            </CommandEmpty>
            {Object.entries(grouped)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([letter, items]) => (
                <CommandGroup key={letter} heading={letter}>
                  {items.map((merchant) => (
                    <CommandItem
                      key={merchant.id}
                      value={merchant.name}
                      onSelect={() => {
                        onSelect(merchant);
                        setOpen(false);
                      }}
                      className="cursor-pointer"
                    >
                      <Check className="mr-2 h-4 w-4 opacity-0" />
                      <div className="flex-1">
                        <span className="text-sm">{merchant.name}</span>
                        {merchant.categoryName && (
                          <span className="ml-2 text-xs text-muted-foreground">
                            {merchant.categoryName}
                          </span>
                        )}
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
