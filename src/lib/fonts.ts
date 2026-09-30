import localFont from "next/font/local";
import { Inter, Silkscreen } from "next/font/google";

export const leagueGothic = localFont({
  src: "../fonts/LeagueGothic-Regular.ttf",
  weight: "400",
});

export const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter",
});

// Retro — a genuine pixel/bitmap font, matching the blocky, wide-set look
// of a classic 8-bit terminal boot screen (the requested reference look)
// rather than a smooth digital-readout font like the previous Share Tech
// Mono.
export const teletext = Silkscreen({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-teletext",
});
