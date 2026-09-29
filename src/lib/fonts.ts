import localFont from "next/font/local";
import { Inter, VT323 } from "next/font/google";

export const leagueGothic = localFont({
  src: "../fonts/LeagueGothic-Regular.ttf",
  weight: "400",
});

export const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter",
});

// Retro week — a blocky monospace terminal font standing in for teletext's
// low-res character grid (there's no real teletext font on Google Fonts).
export const teletext = VT323({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-teletext",
});
