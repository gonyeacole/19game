import type { Metadata } from "next";
import TabNav from "@/components/TabNav";
import ThemeToggle from "@/components/ThemeToggle";
import RefreshButton from "@/components/RefreshButton";
import AddToHomeScreen from "@/components/AddToHomeScreen";
import AnnouncementBell from "@/components/AnnouncementBell";
import { leagueGothic, inter } from "@/lib/fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "19 League",
  description: "NFL Exactly 19 pool — scores, pot, and payments",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "19 League",
    statusBarStyle: "black-translucent",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  // Without this, iOS never reports real env(safe-area-inset-*) values —
  // they silently resolve to 0, so TabNav's safe-area padding does nothing
  // once the app is added to the home screen and runs edge-to-edge.
  viewportFit: "cover",
};

// Runs before paint so the right theme applies immediately — avoids a
// flash of the wrong theme while React hydrates.
const THEME_INIT_SCRIPT = `
(function () {
  try {
    var stored = localStorage.getItem("theme");
    var theme = stored || (matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark");
    document.documentElement.dataset.theme = theme;
  } catch (e) {}
})();
`;

// The (display-mode: standalone) media query should catch "launched from
// an Add to Home Screen bookmark" too, but navigator.standalone (Safari's
// own iOS-specific flag) is the more battle-tested check for it.
const STANDALONE_INIT_SCRIPT = `
(function () {
  var standalone =
    window.navigator.standalone === true ||
    matchMedia("(display-mode: standalone)").matches;
  if (standalone) document.documentElement.dataset.standalone = "true";
})();
`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`h-full antialiased ${inter.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <script dangerouslySetInnerHTML={{ __html: STANDALONE_INIT_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col bg-field text-chalk">
        <header className="safe-top sticky top-0 z-10 grid grid-cols-[1fr_auto_1fr] items-center border-b border-line bg-field px-4 pb-3">
          <div className="flex items-center justify-self-start gap-2">
            <AddToHomeScreen />
            <ThemeToggle />
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
        <main className="flex-1 pb-24">{children}</main>
        <TabNav />
      </body>
    </html>
  );
}
