"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  {
    href: "/scores",
    label: "Scores",
    icon: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="16" height="10" rx="1.5" />
        <line x1="10" y1="3" x2="10" y2="13" />
        <circle cx="6" cy="8" r="1" fill="currentColor" stroke="none" />
        <circle cx="14" cy="8" r="1" fill="currentColor" stroke="none" />
        <line x1="6" y1="16" x2="6" y2="18" />
        <line x1="14" y1="16" x2="14" y2="18" />
      </svg>
    ),
  },
  {
    href: "/pot",
    label: "Pot",
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor">
        <path d="M6 6 L7.2 3.5 L12.8 3.5 L14 6 Q17 9.5 17 13 Q17 17.5 10 17.5 Q3 17.5 3 13 Q3 9.5 6 6 Z" />
        <text x="10" y="13.3" textAnchor="middle" fontSize="7.2" fontWeight="700" fill="var(--color-panel-2)">
          $
        </text>
      </svg>
    ),
  },
  {
    href: "/pay",
    label: "Pay",
    icon: (
      <svg viewBox="0 0 20 20">
        <text x="10" y="15.5" textAnchor="middle" fontSize="15" fontWeight="700" fill="currentColor">
          $
        </text>
      </svg>
    ),
  },
  {
    href: "/admin",
    label: "Admin",
    icon: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
        <circle cx="10" cy="10" r="4.2" />
        <circle cx="10" cy="10" r="1.3" fill="currentColor" stroke="none" />
        <g fill="currentColor" stroke="none">
          <rect x="8.7" y="4.5" width="2.6" height="2.9" rx="0.6" transform="rotate(0 10 10)" />
          <rect x="8.7" y="4.5" width="2.6" height="2.9" rx="0.6" transform="rotate(45 10 10)" />
          <rect x="8.7" y="4.5" width="2.6" height="2.9" rx="0.6" transform="rotate(90 10 10)" />
          <rect x="8.7" y="4.5" width="2.6" height="2.9" rx="0.6" transform="rotate(135 10 10)" />
          <rect x="8.7" y="4.5" width="2.6" height="2.9" rx="0.6" transform="rotate(180 10 10)" />
          <rect x="8.7" y="4.5" width="2.6" height="2.9" rx="0.6" transform="rotate(225 10 10)" />
          <rect x="8.7" y="4.5" width="2.6" height="2.9" rx="0.6" transform="rotate(270 10 10)" />
          <rect x="8.7" y="4.5" width="2.6" height="2.9" rx="0.6" transform="rotate(315 10 10)" />
        </g>
      </svg>
    ),
  },
] as const;

export default function TabNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-20 border-t border-line bg-panel-2 pb-[env(safe-area-inset-bottom)]"
      aria-label="Primary"
    >
      <ul className="mx-auto grid max-w-lg grid-cols-4">
        {TABS.map((tab) => {
          const active = pathname === tab.href || pathname?.startsWith(tab.href + "/");
          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                className={`flex flex-col items-center gap-1 py-2.5 text-[11px] font-semibold uppercase tracking-wide transition-colors ${
                  active ? "text-led" : "text-chalk-faint"
                }`}
              >
                <span className="h-[19px] w-[19px]">{tab.icon}</span>
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
