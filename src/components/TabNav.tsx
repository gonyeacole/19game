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
    href: "/teams",
    label: "Teams",
    icon: (
      <svg viewBox="0 0 20 20">
        <path
          fill="currentColor"
          d="M2.2 11.8C2.2 6 6.4 2 10.6 2c4 0 6.8 3.2 6.8 7.1 0 1.4-.7 2.4-1.8 2.9l.1 1.3c-1.9-.2-3.5.3-4.2 1.3-1 1-2.7 1.4-4.1 1-.8 1-2.3 1.2-3.3.4-1.2-.4-1.9-2.1-1.9-4.2Z"
        />
        <circle cx="6.2" cy="10.9" r="1" fill="var(--color-panel-2)" />
        <g stroke="currentColor" strokeWidth="1.2" fill="none" strokeLinecap="round" strokeLinejoin="round">
          <path d="M11.4 14.7c.6-1.3 2.2-1.8 4.3-1.6 1.3.1 2.2.5 2 1.3l-.7 2.6c-.2.6-.9.8-1.4.4L12 15" />
          <path d="M12.5 15.9l4.4-.3" />
        </g>
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
    href: "/admin",
    label: "Admin",
    icon: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
        <circle cx="10" cy="10" r="4.8" />
        <circle cx="10" cy="10" r="1.5" fill="currentColor" stroke="none" />
        <g fill="currentColor" stroke="none">
          <rect x="8.5" y="3.7" width="3" height="3.3" rx="0.7" transform="rotate(0 10 10)" />
          <rect x="8.5" y="3.7" width="3" height="3.3" rx="0.7" transform="rotate(45 10 10)" />
          <rect x="8.5" y="3.7" width="3" height="3.3" rx="0.7" transform="rotate(90 10 10)" />
          <rect x="8.5" y="3.7" width="3" height="3.3" rx="0.7" transform="rotate(135 10 10)" />
          <rect x="8.5" y="3.7" width="3" height="3.3" rx="0.7" transform="rotate(180 10 10)" />
          <rect x="8.5" y="3.7" width="3" height="3.3" rx="0.7" transform="rotate(225 10 10)" />
          <rect x="8.5" y="3.7" width="3" height="3.3" rx="0.7" transform="rotate(270 10 10)" />
          <rect x="8.5" y="3.7" width="3" height="3.3" rx="0.7" transform="rotate(315 10 10)" />
        </g>
      </svg>
    ),
  },
] as const;

export default function TabNav() {
  const pathname = usePathname();

  return (
    <nav
      className="safe-bottom z-10 shrink-0 border-t border-line bg-field"
      aria-label="Primary"
    >
      <ul className="mx-auto grid max-w-lg grid-cols-4">
        {TABS.map((tab) => {
          const active = pathname === tab.href || pathname?.startsWith(tab.href + "/");
          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                className={`flex flex-col items-center gap-1 pb-1 pt-1 text-xs font-semibold transition-colors ${
                  active ? "text-led" : "text-chalk-faint"
                }`}
              >
                <span className="h-6 w-6">{tab.icon}</span>
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
