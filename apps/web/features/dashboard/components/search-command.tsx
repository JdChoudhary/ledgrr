"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
} from "@/components/ui/command";
import { navigation, type NavigationItem } from "../lib/navigation";

/**
 * Flatten navigation tree into searchable items with section labels.
 */
type FlatItem = {
  id: string;
  label: string;
  href: string;
  icon: React.ElementType;
  section: string;
};

function flattenNavigation(items: NavigationItem[], section?: string): FlatItem[] {
  const result: FlatItem[] = [];
  for (const item of items) {
    const sec = section ?? item.label;
    result.push({
      id: item.id,
      label: item.label,
      href: item.href,
      icon: item.icon,
      section: sec,
    });
    if (item.children) {
      for (const child of item.children) {
        result.push({
          id: child.id,
          label: child.label,
          href: child.href,
          icon: child.icon,
          section: sec,
        });
      }
    }
  }
  return result;
}

const allPages = flattenNavigation(navigation);

// Group by top-level section
const sections = Array.from(
  allPages.reduce((map, item) => {
    if (!map.has(item.section)) map.set(item.section, []);
    map.get(item.section)!.push(item);
    return map;
  }, new Map<string, FlatItem[]>()),
);

export function SearchCommand() {
  const [open, setOpen] = React.useState(false);
  const router = useRouter();

  // Global keyboard shortcut: Ctrl+K / Cmd+K
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const handleSelect = React.useCallback(
    (href: string) => {
      setOpen(false);
      router.push(href);
    },
    [router],
  );

  return (
    <>
      {/* Trigger button — visible in sidebar header and dashboard header */}
      <button
        onClick={() => setOpen(true)}
        className="flex h-8 items-center gap-2 rounded-lg border border-border/50 bg-muted/50 px-3 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="size-3.5 shrink-0"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        </svg>
        <span className="hidden sm:inline">Search…</span>
        <kbd className="pointer-events-none ml-1 hidden select-none rounded-sm border border-border/50 bg-background px-1 py-0.5 font-mono text-[10px] font-medium text-muted-foreground sm:inline">
          ⌘K
        </kbd>
      </button>

      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title="Search pages"
        description="Navigate to any page in the dashboard"
      >
        <CommandInput placeholder="Type a page name…" />
        <CommandList>
          <CommandEmpty>No pages found.</CommandEmpty>
          {sections.map(([sectionName, items]) => (
            <CommandGroup key={sectionName} heading={sectionName}>
              {items.map((item) => {
                const Icon = item.icon;
                return (
                  <CommandItem
                    key={item.id}
                    value={`${item.label} ${item.section}`}
                    onSelect={() => handleSelect(item.href)}
                  >
                    <Icon className="size-4 shrink-0 text-muted-foreground" />
                    <span>{item.label}</span>
                    <CommandShortcut>
                      <kbd className="pointer-events-none inline-flex h-4 items-center rounded border border-border/40 bg-muted px-1 font-mono text-[9px] text-muted-foreground">
                        ↵
                      </kbd>
                    </CommandShortcut>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          ))}
        </CommandList>
      </CommandDialog>
    </>
  );
}
