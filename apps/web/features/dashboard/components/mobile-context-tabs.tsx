"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { getActiveSection, isRouteActive } from "../lib/navigation";

export function MobileContextTabs() {
  const pathname = usePathname();

  const section = getActiveSection(pathname);

  if (!section?.children) {
    return null;
  }

  return (
    <div className="scrollbar-none flex overflow-x-auto border-b md:hidden">
        {section.children.map((item) => {
          const active = isRouteActive(pathname, item.href);

          return (
            <Link
              key={item.id}
              href={item.href}
              className={[
                "relative shrink-0 px-3 py-3 text-sm",
                "text-muted-foreground",
                active && "text-foreground",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              {item.label}

              {active && <span className="absolute inset-x-3 bottom-0 h-px bg-foreground" />}
            </Link>
          );
        })}
    </div>
  );
}
