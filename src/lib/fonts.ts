import localFont from "next/font/local";
import { IBM_Plex_Sans } from "next/font/google";

export const leagueGothic = localFont({
  src: "../fonts/LeagueGothic-Regular.ttf",
  weight: "400",
});

// Free lookalike for Chirp (X/Twitter's proprietary font, not licensed for
// reuse here) — swapped in for every "Helvetica" spot via --font-sans.
export const ibmPlexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-plex",
});
