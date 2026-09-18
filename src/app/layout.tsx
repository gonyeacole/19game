import type { Metadata } from "next";
import TabNav from "@/components/TabNav";
import SplashScreen from "@/components/SplashScreen";
import ThemeToggle from "@/components/ThemeToggle";
import RefreshButton from "@/components/RefreshButton";
import AddToHomeScreen from "@/components/AddToHomeScreen";
import AnnouncementBell from "@/components/AnnouncementBell";
import { ibmPlexSans, leagueGothic } from "@/lib/fonts";
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

// Decides here — before the browser paints any HTML at all — whether the
// splash should show, and stamps the result onto <html> for the CSS rule in
// globals.css to key off. SplashScreen itself always renders the same
// markup on the server and on first hydration (there's no way to know
// localStorage during either), so without this, the splash's green
// background would flash on screen for a frame on every reload before
// SplashScreen's own client-side effects had a chance to hide it.
const SPLASH_INIT_SCRIPT = `
(function () {
  try {
    var KEY = "splashLastOpenAt";
    var WINDOW_MS = 5 * 60 * 1000;
    var last = localStorage.getItem(KEY);
    var now = Date.now();
    localStorage.setItem(KEY, String(now));
    var skip = last != null && now - Number(last) < WINDOW_MS;
    document.documentElement.dataset.splash = skip ? "skip" : "show";
  } catch (e) {
    document.documentElement.dataset.splash = "show";
  }
})();
`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`h-full antialiased ${ibmPlexSans.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <script dangerouslySetInnerHTML={{ __html: STANDALONE_INIT_SCRIPT }} />
        <script dangerouslySetInnerHTML={{ __html: SPLASH_INIT_SCRIPT }} />
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
        {/*
          min-h forces every page to be at least a little taller than the
          viewport, even ones whose own content (Chat, a logged-out Admin)
          doesn't naturally fill it. iOS WebKit has been observed
          positioning position:fixed elements (TabNav) against a different
          reference on a page that's exactly viewport height or shorter —
          nothing to scroll — than on a genuinely scrollable one; comparing
          screenshots pixel-for-pixel showed TabNav sitting measurably
          higher specifically on the short pages. Guaranteeing real,
          if invisible, scroll room on every page is the standard fix for
          this class of bug.
        */}
        <main className="min-h-[calc(100dvh+20px)] flex-1 pb-24">{children}</main>
        <TabNav />
        <SplashScreen />
      </body>
    </html>
  );
}
