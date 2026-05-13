"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

// Max 5 visible — prioritize: Dashboard, Markets, Portfolio, Orders, F&O
const TABS = [
  { href: "/dashboard", label: "Home"      },
  { href: "/stocks",    label: "Markets"   },
  { href: "/portfolio", label: "Portfolio" },
  { href: "/orders",    label: "Orders"    },
  { href: "/fno",       label: "F&O"       },
];

export function MobileNav() {
  const path = usePathname();
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex z-40">
      {TABS.map((tab) => {
        const active = path === tab.href || path.startsWith(tab.href + "/");
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "flex-1 flex flex-col items-center py-2.5 text-xs font-medium transition",
              active ? "text-gray-900" : "text-gray-400 hover:text-gray-600"
            )}
          >
            <span
              className={cn(
                "w-1 h-1 rounded-full mb-1",
                active ? "bg-gray-900" : "bg-transparent"
              )}
            />
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
