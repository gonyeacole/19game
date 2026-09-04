"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/scores", label: "Scores", icon: "🏈" },
  { href: "/pot", label: "Pot", icon: "💰" },
  { href: "/pay", label: "Pay", icon: "💸" },
  { href: "/admin", label: "Admin", icon: "⚙️" },
] as const;

export default function TabNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-20 border-t border-black/10 bg-white/95 backdrop-blur pb-[env(safe-area-inset-bottom)] dark:border-white/10 dark:bg-black/90"
      aria-label="Primary"
    >
      <ul className="mx-auto grid max-w-lg grid-cols-4">
        {TABS.map((tab) => {
          const active = pathname === tab.href || pathname?.startsWith(tab.href + "/");
          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                className={`flex flex-col items-center gap-0.5 py-2 text-xs font-medium transition-colors ${
                  active
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-black/50 dark:text-white/50"
                }`}
              >
                <span className="text-lg leading-none">{tab.icon}</span>
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
