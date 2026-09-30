"use client";

import { useRetroMode } from "@/lib/retroMode";
import AddToHomeScreen from "@/components/AddToHomeScreen";
import ThemeToggle from "@/components/ThemeToggle";
import RetroToggle from "@/components/RetroToggle";
import RefreshButton from "@/components/RefreshButton";
import AnnouncementBell from "@/components/AnnouncementBell";
import SectionBadge from "@/components/SectionBadge";
import { leagueGothic } from "@/lib/fonts";

// Splits into per-letter spans so globals.css's .rainbow-title rule can
// color each one — a space becomes a non-breaking space so it still takes
// up width once it's its own inline span. Retro-only, like a teletext
// masthead's rainbow lettering.
function RainbowTitle({ text }: { text: string }) {
  return (
    <span className="rainbow-title">
      {[...text].map((ch, i) => (
        <span key={i}>{ch === " " ? " " : ch}</span>
      ))}
    </span>
  );
}

export default function AppHeader() {
  const retro = useRetroMode();

  if (retro) {
    return (
      <header className="safe-top sticky top-0 z-10 bg-field">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center border-b border-line px-4 pb-3 pt-2">
          <div className="flex items-center justify-self-start gap-2">
            <AddToHomeScreen />
            <ThemeToggle />
            <RetroToggle />
          </div>
          <span
            className="justify-self-center text-3xl leading-none tracking-wide"
            style={{ fontWeight: 700 }}
          >
            <RainbowTitle text="19League" />
          </span>
          <div className="flex items-center justify-self-end gap-2">
            <RefreshButton />
            <AnnouncementBell />
          </div>
        </div>
        <SectionBadge />
      </header>
    );
  }

  return (
    <header className="safe-top sticky top-0 z-10 grid grid-cols-[1fr_auto_1fr] items-center border-b border-line bg-field px-4 pb-3">
      <div className="flex items-center justify-self-start gap-2">
        <AddToHomeScreen />
        <ThemeToggle />
        <RetroToggle />
      </div>
      <span
        className={`${leagueGothic.className} justify-self-center text-3xl leading-none tracking-wide text-led`}
        style={{ fontWeight: 700 }}
      >
        19League
      </span>
      <div className="flex items-center justify-self-end gap-2">
        <RefreshButton />
        <AnnouncementBell />
      </div>
    </header>
  );
}
