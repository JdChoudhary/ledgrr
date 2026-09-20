"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";

type MobileSectionItem = {
  id: string;
  label: string;
  href: string;
  icon?: LucideIcon;
};

type MobileSectionProps = {
  title: string;
  items: MobileSectionItem[];
  onItemClick?: () => void;
};

export function MobileSection({ title, items, onItemClick }: MobileSectionProps) {
  return (
    <section className="space-y-2">
      <h3 className="px-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {title}
      </h3>

      <div className="overflow-hidden rounded-xl border">
        {items.map((item, index) => {
          const Icon = item.icon;

          return (
            <Link
              key={item.id}
              href={item.href}
              onClick={onItemClick}
              className={[
                "flex min-h-12 items-center gap-3 px-4",
                "transition-colors hover:bg-muted/50",
                index !== items.length - 1 && "border-b",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              {Icon && <Icon className="size-4 text-muted-foreground" />}

              <span className="flex-1 text-sm font-medium">{item.label}</span>

              <ChevronRight className="size-4 text-muted-foreground" />
            </Link>
          );
        })}
      </div>
    </section>
  );
}
