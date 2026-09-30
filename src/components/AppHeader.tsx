"use client";

import { useRetroMode } from "@/lib/retroMode";
import AddToHomeScreen from "@/components/AddToHomeScreen";
import ThemeToggle from "@/components/ThemeToggle";
import RetroToggle from "@/components/RetroToggle";
import RefreshButton from "@/components/RefreshButton";
import AnnouncementBell from "@/components/AnnouncementBell";
import { leagueGothic } from "@/lib/fonts";

// Fixed literal colors, not theme tokens — matching a specific reference
// screen's own white/black and blue/green masthead exactly, the same
// "brand color, not themed UI" reasoning SplashScreen uses for its fixed
// green. "19" sits in its own white/black cells; "League" is one solid
// blue block with green cutout text, the same two-part treatment the
// reference gives its own name and its "FOOTBALL" tag.
function CultTitle() {
  const cellStyle = { backgroundColor: "#ffffff", color: "#000000" };
  return (
    <div className="flex items-stretch text-2xl" style={{ fontWeight: 700 }}>
      <span className="flex items-center justify-center border-2 border-black px-2" style={cellStyle}>
        1
      </span>
      <span
        className="flex items-center justify-center border-2 border-l-0 border-black px-2"
        style={cellStyle}
      >
        9
      </span>
      <span
        className="flex items-center px-3 uppercase"
        style={{ backgroundColor: "#0000ff", color: "#00ff00" }}
      >
        League
      </span>
    </div>
  );
}

export default function AppHeader() {
  const retro = useRetroMode();

  if (retro) {
    return (
      <header className="safe-top sticky top-0 z-10 border-b border-line bg-field">
        <div className="grid grid-cols-4 border-b border-line">
          <RetroToggle variant="tab" />
          <AddToHomeScreen variant="tab" />
          <RefreshButton variant="tab" />
          <AnnouncementBell variant="tab" />
        </div>
        <div className="flex items-center justify-center py-3">
          <CultTitle />
        </div>
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
