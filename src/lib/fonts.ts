import localFont from "next/font/local";
import { Inter, Share_Tech_Mono } from "next/font/google";

export const leagueGothic = localFont({
  src: "../fonts/LeagueGothic-Regular.ttf",
  weight: "400",
});

export const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter",
});

// Retro — a digital-readout monospace standing in for teletext's low-res
// character grid. Switched from VT323 (a genuine pixel font) to this: VT323's
// glyphs have a much smaller apparent x-height than its declared size, which
// read as "too small" everywhere (the title, tab labels, section headers)
// even after the font-size compensation below. Share Tech Mono's letterforms
// fill their box the way a normal font does, so it reads clearly at the same
// sizes the rest of the UI already uses.
export const teletext = Share_Tech_Mono({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-teletext",
});
