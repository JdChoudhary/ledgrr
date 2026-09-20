"use client";

import * as React from "react";
import Link from "next/link";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar";

import { DesktopNavigation } from "./desktop-navagition";
import { SidebarUser } from "./sidebar-user";

export function AppSidebar() {
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="h-14 border-b">
        <Link href="/dashboard" className="flex h-full items-center gap-2 px-2">
          <div className="flex size-7 items-center justify-center rounded-md border font-semibold">
            L
          </div>

          <span className="font-semibold group-data-[collapsible=icon]:hidden">Ledgr</span>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <DesktopNavigation />
      </SidebarContent>

      <SidebarFooter>
        <SidebarUser />
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}