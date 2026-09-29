"use client";

import { usePathname } from "next/navigation";
import { TABS, TAB_BG, TAB_TEXT } from "@/components/TabNav";

// A full-width colored banner naming the current section, underneath the
// site title — mirrors a teletext masthead's own colored "channel" box
// (e.g. Ceefax's "FOOTBALL" bar) sitting right under the page's own name.
// Reuses TabNav's per-tab colors so the header and the bottom nav agree on
// which color means which section.
export default function SectionBadge() {
  const pathname = usePathname();
  const tab = TABS.find((t) => pathname === t.href || pathname?.startsWith(t.href + "/"));
  if (!tab) return null;

  return (
    <div className={`${TAB_BG[tab.color]} px-4 py-1.5`}>
      <span
        className={`teletext-3d-text text-lg font-bold uppercase tracking-widest ${TAB_TEXT[tab.color]}`}
      >
        {tab.label}
      </span>
    </div>
  );
}
