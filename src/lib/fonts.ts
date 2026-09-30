import localFont from "next/font/local";
import { Bungee, Inter } from "next/font/google";

export const leagueGothic = localFont({
  src: "../fonts/LeagueGothic-Regular.ttf",
  weight: "400",
});

export const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter",
});

// Retro — Bedstead, a pixel-accurate recreation of the actual Mullard
// SAA5050 character set real UK teletext (Ceefax) hardware rendered, by
// bjh21 (https://bjh21.me.uk/bedstead/, CC0 — see src/fonts/Bedstead-
// LICENSE.txt). Self-hosted via next/font/local rather than a CDN import:
// bjh21.me.uk itself isn't reachable from every network, but the same
// CC0-licensed file is also published as the npm package
// @techandsoftware/teletext-fonts, which is where this copy came from.
export const teletext = localFont({
  src: "../fonts/Bedstead.otf",
  weight: "400",
  variable: "--font-teletext",
});

// Retro masthead only — Bungee, a bold condensed display face matching the
// CULTFAX reference's own logotype, deliberately different from the
// app-wide Bedstead body font (the user explicitly OK'd a separate font
// for just this logo).
export const bungee = Bungee({
  subsets: ["latin"],
  weight: "400",
});
