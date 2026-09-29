import Link from "next/link";
import { isRouteActive } from "../lib/navigation";
// import { QuickActionsTrigger } from "./quick-actions";
import { usePathname } from "next/dist/client/components/navigation";
import { Home } from "lucide-react";
import { SidebarMenu } from "@/components/ui/sidebar";
import {
  //   SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
} from "@/components/ui/sidebar";
import { navigation } from "../lib/navigation";
export function DesktopNavigation() {
  const pathname = usePathname();

  return (
    <div className="space-y-4 px-2 py-3">
      {/* Dashboard */}
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton
            render={
              <Link href="/dashboard">
                <Home />
                <span>Dashboard</span>
              </Link>
            }
            isActive={pathname === "/dashboard"}
          ></SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>

      {/* Sections */}
      {navigation
        .filter((section) => section.children)
        .map((section) => {
          const SectionIcon = section.icon;

          return (
            <SidebarGroup key={section.id}>
              <SidebarGroupLabel>
                <SectionIcon className="size-3.5" />
                {section.label}
              </SidebarGroupLabel>

              <SidebarGroupContent>
                <SidebarMenu>
                  {section.children!.map((item) => {
                    const Icon = item.icon;

                    const active = isRouteActive(pathname, item.href);

                    return (
                      <SidebarMenuItem key={item.id}>
                        <SidebarMenuButton
                          render={
                            <Link href={item.href}>
                              <Icon />
                              <span>{item.label}</span>
                            </Link>
                          }
                          isActive={active}
                        ></SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          );
        })}
    </div>
  );
}
