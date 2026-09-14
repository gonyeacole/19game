import localFont from "next/font/local";
import { Inter } from "next/font/google";

export const leagueGothic = localFont({
  src: "../fonts/LeagueGothic-Regular.ttf",
  weight: "400",
});

// Free lookalike for Chirp (X/Twitter's proprietary font, not licensed for
// reuse here) — swapped in for every "Helvetica" spot via --font-sans.
export const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
