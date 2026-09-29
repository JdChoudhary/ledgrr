"use client";

import { MoreHorizontal } from "lucide-react";

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

import { MobileSection } from "./mobile-section";
import { navigation } from "../lib/navigation";

export function MobileMoreTrigger() {
  const sections = navigation.filter((section) =>
    ["money", "together", "tools"].includes(section.id),
  );

  return (
    <Sheet>
      <SheetTrigger
        render={
          <button className="flex flex-col items-center justify-center gap-1 text-muted-foreground">
            <MoreHorizontal className="size-5" />
            <span className="text-[11px] font-medium">More</span>
          </button>
        }
      />

      <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-2xl">
        <SheetHeader>
          <SheetTitle>More</SheetTitle>
        </SheetHeader>

        <div className="space-y-6 py-5">
          {sections.map((section) => (
            <MobileSection key={section.id} title={section.label} items={section.children ?? []} />
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
