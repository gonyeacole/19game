"use client";

import { useRetroMode } from "@/lib/retroMode";
import AddToHomeScreen from "@/components/AddToHomeScreen";
import ThemeToggle from "@/components/ThemeToggle";
import RetroToggle from "@/components/RetroToggle";
import RefreshButton from "@/components/RefreshButton";
import AnnouncementBell from "@/components/AnnouncementBell";
import { archivoBlack, leagueGothic } from "@/lib/fonts";

// Fixed literal colors, not theme tokens — matching a specific reference
// screen's own white/black and blue/green masthead exactly, the same
// "brand color, not themed UI" reasoning SplashScreen uses for its fixed
// green. "19" sits in its own white/black cells on the left, fixed width;
// "League" is one solid blue block with green cutout text that grows
// (flex-1) to fill the rest of the header's width, the same "name cell
// plus a banner stretching to the edge" layout the reference uses for its
// own name and "FOOTBALL" tag.
function CultTitle() {
  const cellStyle = { backgroundColor: "#ffffff", color: "#000000" };
  return (
    <div className={`${archivoBlack.className} flex h-16 items-stretch text-4xl`}>
      <span className="flex w-16 items-center justify-center border-4 border-black" style={cellStyle}>
        1
      </span>
      <span
        className="flex w-16 items-center justify-center border-4 border-l-0 border-black"
        style={cellStyle}
      >
        9
      </span>
      <span
        className="flex flex-1 items-center pl-4 uppercase tracking-widest"
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
        <CultTitle />
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
