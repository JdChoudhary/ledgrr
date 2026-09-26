"use client";

import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { SearchCommand } from "./search-command";

type DashboardHeaderProps = {
  title: string;
  description?: string;
  actions?: React.ReactNode;
};

export function DashboardHeader({ title, description, actions }: DashboardHeaderProps) {
  return (
    <header className="flex min-h-14 flex-wrap items-center gap-2 border-b border-border px-4 py-2 md:h-14 md:py-0">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 h-4" />

      <div className="flex min-w-0 max-w-full flex-1 basis-32 flex-col">
        <h1 className="truncate text-sm font-medium">{title}</h1>
        {description ? (
          <p className="truncate text-xs text-muted-foreground">{description}</p>
        ) : null}
      </div>

      <div className="ml-auto flex min-w-0 items-center gap-2 [flex-wrap:wrap]">
        <SearchCommand />
        {actions}
      </div>
    </header>
  );
}
