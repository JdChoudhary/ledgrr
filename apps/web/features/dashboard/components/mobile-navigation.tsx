"use client";

import Link from "next/link";
import { isRouteActive } from "../lib/navigation";
import { QuickActionsTrigger } from "./quick-actions";
import { usePathname } from "next/navigation";
import { MoreHorizontal, Home, CreditCard, BarChart3, Plus } from "lucide-react";
import { MobileMoreTrigger } from "./mobile-more-trigger";
export function MobileNavigation() {
  const pathname = usePathname();

  const items = [
    {
      id: "home",
      label: "Home",
      href: "/dashboard",
      icon: Home,
    },
    {
      id: "money",
      label: "Money",
      href: "/dashboard/transactions",
      icon: CreditCard,
    },
    {
      id: "add",
      label: "Add",
      href: "#",
      icon: Plus,
    },
    {
      id: "insights",
      label: "Insights",
      href: "/dashboard/insights",
      icon: BarChart3,
    },
    {
      id: "more",
      label: "More",
      href: "#",
      icon: MoreHorizontal,
    },
  ];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t bg-background/95 backdrop-blur md:hidden">
      <div className="grid h-16 grid-cols-5">
        {items.map((item) => {
          const Icon = item.icon;

          if (item.id === "add") {
            return <QuickActionsTrigger key={item.id} />;
          }

          if (item.id === "more") {
            return <MobileMoreTrigger key={item.id} />;
          }

          const active = isRouteActive(pathname, item.href);

          return (
            <Link
              key={item.id}
              href={item.href}
              className={[
                "flex flex-col items-center justify-center gap-1",
                "text-muted-foreground transition-colors",
                active && "text-foreground",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <Icon className={["size-5", active && "stroke-[2.2]"].filter(Boolean).join(" ")} />

              <span className="text-[11px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
